// src/systems/UnitManager.js
import {Unit} from '../gameObjects/Unit.js';
import {UNIT_TYPES} from "../gameObjects/unitTypes.js";
import {ABILITIES} from "../gameObjects/abilities.js";
import ASSETS from "../assets.js";

export class UnitManager {
    constructor(scene) {
        this.scene = scene;
        this.units = [];
        this.playerUnits = [];
    }

    createUnit(unitData) {
        const screenX = this.scene.mapManager.origin.x + (unitData.position.x - unitData.position.y) * this.scene.mapManager.mapConsts.HALF_WIDTH;
        const screenY = this.scene.mapManager.origin.y + (unitData.position.x + unitData.position.y) * this.scene.mapManager.mapConsts.QUARTER_HEIGHT;

        const unitType = UNIT_TYPES[unitData.unitType];
        if (unitType) {
            const stats = {...unitType.stats};
            const moves = unitType.moves.map(abilityKey => {
                const abilityTemplate = ABILITIES[abilityKey];
                const move = {...abilityTemplate};
                if (move.type === 'move') {
                    move.range = stats.moveRange;
                }
                return move;
            });

            const unit = new Unit(this.scene, {
                gridX: unitData.position.x,
                gridY: unitData.position.y,
                texture: ASSETS.image[unitType.textureKey].key,
                frame: unitType.frame || null,
                name: unitType.name,
                stats: stats,
                moves: moves,
                isPlayer: unitType.isPlayer
            });

            this.units.push(unit);
            if (unit.isPlayer) {
                this.playerUnits.push(unit);
            }
            this.scene.makeUnitInteractive(unit);

            unit.sprite.setData('originalY', screenY);
            unit.sprite.setData('finalY', screenY);
            unit.sprite.y -= 300; // Start in the sky
            unit.sprite.alpha = 0; // Start invisible
            this.scene.animObjects.push(unit.sprite);

            if (unit.shadow) {
                unit.shadow.setData('finalY', screenY);
                unit.shadow.y -= 300;
                unit.shadow.alpha = 0;
                this.scene.animObjects.push(unit.shadow);
            }
        }
    }

    getUnitAtGridPos(gridPos) {
        for (const unit of this.units) {
            if (unit.gridPos.x === gridPos.x && unit.gridPos.y === gridPos.y) {
                return unit;
            }
        }
        return null;
    }
}
