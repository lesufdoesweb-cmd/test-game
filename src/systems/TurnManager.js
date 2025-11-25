// src/systems/TurnManager.js
export class TurnManager {
    constructor(scene) {
        this.scene = scene;
        this.turnOrder = [];
        this.turnIndex = 0;
    }

    buildTurnOrder(units) {
        this.turnOrder = [...units].sort((a, b) => b.stats.speed - a.stats.speed);
        this.scene.events.emit('turn_order_built', this.turnOrder);
    }

    start() {
        this.turnIndex = 0;
        this.startNextTurn();
    }

    startNextTurn() {
        if (this.turnOrder.length === 0) return;

        if (this.turnIndex === 0) {
            this.scene.unitManager.units.forEach(unit => this.updateCooldowns(unit));
        }

        const currentUnit = this.turnOrder[this.turnIndex];

        currentUnit.statusEffects.forEach(effect => {
            effect.duration--;
        });
        currentUnit.statusEffects = currentUnit.statusEffects.filter(effect => effect.duration > 0);

        this.scene.events.emit('turn_changed', this.turnIndex);

        if (currentUnit.isPlayer) {
            this.scene.startPlayerUnitTurn(currentUnit);
        } else {
            this.scene.startEnemyTurn(currentUnit);
        }
    }

    endTurn() {
        this.turnIndex = (this.turnIndex + 1) % this.turnOrder.length;
        this.startNextTurn();
    }

    updateCooldowns(unit) {
        unit.moves.forEach(move => {
            if (move.currentCooldown > 0) {
                move.currentCooldown--;
            }
        });
    }

    removeUnit(unit) {
        const index = this.turnOrder.indexOf(unit);
        if (index > -1) {
            this.turnOrder.splice(index, 1);
        }
        if (this.turnIndex >= this.turnOrder.length) {
            this.turnIndex = 0;
        }
    }
}
