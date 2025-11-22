import ASSETS from '../assets.js';
import {Unit} from '../gameObjects/Unit.js';
import {level1Config} from '../levels/level1_config.js';
import {LevelGenerator} from "../LevelGenerator.js";
import {Obstacle} from '../gameObjects/Obstacle.js';
import {Chest} from '../gameObjects/Chest.js';
import {NPC} from '../gameObjects/NPC.js';

export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
        this.easystar = null;
        this.activePlayerUnit = null;
        this.playerUnits = [];
        this.units = []; // This will hold all Unit objects
        this.grid = [];
        this.origin = {x: 0, y: 0};
        this.mapConsts = {
            MAP_SIZE_X: 0,
            MAP_SIZE_Y: 0,
            TILE_WIDTH: 48,
            HALF_WIDTH: 0,
            QUARTER_HEIGHT: 0,
        }
        this.rangeHighlights = [];
        this.validActionTiles = [];
        this.hoverIndicator = null;

        this.turnOrder = [];
        this.turnIndex = 0;
        this.playerActionState = null; // e.g., 'SELECTING_ACTION', 'MOVING', 'ATTACKING'
        this.vignette = null;
        this.activeUnitTween = null;
        this.isMoving = false; // ensure defined
        this.isMiddleButtonDown = false;
        this.lastCameraX = 0;
        this.lastCameraY = 0;
        this.lastPointerX = 0;
        this.lastPointerY = 0;
    }

    create(data) {
        const levelConfig = data.levelConfig || level1Config;
        const levelData = LevelGenerator.generate(levelConfig);

        this.mapConsts.HALF_WIDTH = this.mapConsts.TILE_WIDTH / 2;
        this.mapConsts.QUARTER_HEIGHT = this.mapConsts.TILE_WIDTH / 4;
        this.mapConsts.MAP_SIZE_X = levelData.mapSize.width;
        this.mapConsts.MAP_SIZE_Y = levelData.mapSize.height;

        this.origin.x = this.scale.width / 2;
        this.origin.y = this.scale.height / 2 - 100;

        // --- Level Setup from Config ---
        this.easystar = new EasyStar.js();
        this.grid = levelData.layout;
        this.easystar.setGrid(this.grid);
        const walkableTiles = Object.keys(levelData.tileset)
            .filter(k => levelData.tileset[k].type === 'walkable' || levelData.tileset[k].type === 'bridge')
            .map(k => parseInt(k));
        this.walkableTiles = walkableTiles;
        this.easystar.setAcceptableTiles(walkableTiles);


        // --- Map Rendering ---
        for (let gridY = 0; gridY < this.mapConsts.MAP_SIZE_Y; gridY++) {
            for (let gridX = 0; gridX < this.mapConsts.MAP_SIZE_X; gridX++) {
                const tileType = this.grid[gridY][gridX];
                if (tileType === -1) continue; // Skip void tiles

                const screenX = this.origin.x + (gridX - gridY) * this.mapConsts.HALF_WIDTH;
                const screenY = this.origin.y  + (gridX + gridY) * this.mapConsts.QUARTER_HEIGHT;

                const tileInfo = levelData.tileset[tileType];
                if (tileInfo && tileInfo.assetKey) {
                    const tile = this.add.image(screenX, screenY, tileInfo.assetKey);
                    tile.setOrigin(0.5, 0.375);
                    tile.setDepth(gridX + gridY);
                }


            }
        }

        // --- Object Creation from Config ---
        levelData.objects.forEach(obj => {
            const screenX = this.origin.x + (obj.position.x - obj.position.y) * this.mapConsts.HALF_WIDTH;
            const screenY = this.origin.y + (obj.position.x + obj.position.y) * this.mapConsts.QUARTER_HEIGHT;

            switch (obj.type) {
                case 'player_start':
                    const archer1 = new Unit(this, {
                        gridX: obj.position.x,
                        gridY: obj.position.y,
                        texture: ASSETS.image.archer.key,
                        name: 'Archer',
                        stats: {maxHealth: 80, currentHealth: 80, moveRange: 5, physicalDamage: 30, speed: 12},
                        isPlayer: true
                    });
                    this.units.push(archer1);
                    this.playerUnits.push(archer1);
                    this.makeUnitInteractive(archer1);

                    const archer2 = new Unit(this, {
                        gridX: obj.position.x + 1,
                        gridY: obj.position.y,
                        texture: ASSETS.image.archer.key,
                        name: 'Archer',
                        stats: {maxHealth: 80, currentHealth: 80, moveRange: 5, physicalDamage: 30, speed: 12},
                        isPlayer: true
                    });
                    this.units.push(archer2);
                    this.playerUnits.push(archer2);
                    this.makeUnitInteractive(archer2);
                    break;
                case 'enemy':
                    if (obj.enemyType === 'Orc') {
                        const orc = new Unit(this, {
                            gridX: obj.position.x,
                            gridY: obj.position.y,
                            texture: ASSETS.spritesheet.basic_unit.key,
                            frame: 26,
                            name: 'Orc',
                            stats: {maxHealth: 80, currentHealth: 80, moveRange: 3, physicalDamage: 35, speed: 12}
                        });
                        this.units.push(orc);
                        this.makeUnitInteractive(orc);
                    }
                    break;
                case 'obstacle':
                    new Obstacle(this, {
                        x: screenX,
                        y: screenY,
                        texture: ASSETS.image.obstacle_tree.key,
                        depth: screenY
                    });
                    break;
                case 'chest':
                    new Chest(this, {
                        x: screenX,
                        y: screenY,
                        texture: ASSETS.spritesheet.items.key,
                        frame: 0,
                        depth: screenY,
                        items: obj.items
                    });
                    break;
                case 'npc':
                    new NPC(this, {
                        x: screenX,
                        y: screenY,
                        texture: ASSETS.spritesheet.npc.key,
                        frame: 0,
                        depth: screenY,
                        npcType: obj.npcType
                    });
                    break;
            }
        });


        // Orc animations removed as per request for programmatic animation
        this.units.forEach(u => {
            if (!u.isPlayer) {
                // Future programmatic idle animation can go here
            }
        });

        // --- Camera and Input ---
        this.cameras.main.setZoom(4.5);
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.centerOn(this.playerUnits[0].sprite.x, this.playerUnits[0].sprite.y);

        // --- Start Game ---
        this.buildTurnOrder();
        this.scene.launch('TimelineUI', {turnOrder: this.turnOrder});
        this.scene.launch('ActionUI');
        this.scene.launch('PlayerStatsUI');

        // Delay the start of the first turn by a tiny amount
        // to ensure all UI scenes have time to set up their event listeners.
        this.time.delayedCall(1, () => {
            this.startNextTurn();
        });

        // --- Event Listeners ---
        this.events.on('unit_stats_changed', (unit) => {
            if (this.playerUnits.includes(unit)) {
                this.events.emit('player_stats_changed', unit);
            }
        });
        this.events.on('action_selected', this.onActionSelected, this);
        this.events.on('unit_died', this.onUnitDied, this);
        this.events.on('action_cancelled', this.cancelPlayerAction, this);
        this.events.on('skip_turn', this.endFullPlayerTurn, this);

        // --- Particle Effects ---
        const particleG = this.add.graphics();
        particleG.fillStyle(0xffffff);
        particleG.fillRect(0, 0, 1, 1);
        particleG.generateTexture('particle', 1, 1);
        particleG.destroy();


        this.events.on('unit_damaged', (x, y, attacker, target) => {

            // compute angle config (default omni)
            let angleCfg = {min: 0, max: 360};

            // Preferred: attacker/target are Unit objects with gridPos
            if (attacker && target && attacker.gridPos && target.gridPos) {
                const dx = target.gridPos.x - attacker.gridPos.x;
                const dy = target.gridPos.y - attacker.gridPos.y;
                const splashAngle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
                angleCfg = {min: splashAngle - 25, max: splashAngle + 25};
            }
            // Fallback: if attacker/target were passed as numbers (coords)
            else if (typeof attacker === 'number' && typeof target === 'number') {
                const dx = x - attacker;
                const dy = y - target;
                const angleDeg = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
                const splashAngle = angleDeg + 180;
                angleCfg = {min: splashAngle - 25, max: splashAngle + 25};
            }

            // Create a ONE-SHOT emitter at the hit location with the chosen angle range.
            // Note: in Phaser >= 3.60 the call signature is this.add.particles(x, y, key, config)
            const emitter = this.add.particles(x, y, 'particle', {
                angle: angleCfg,
                speed: {min: 150, max: 300},
                scale: {start: 4, end: 0},
                lifespan: 500,
                gravityY: 400,
                alpha: {start: 1, end: 0},
                tint: 0xff0000,
                emitting: false   // we'll trigger with explode()
            });

            emitter.setDepth(99999999);
            // explode immediately (one shot)
            if (emitter && emitter.explode) {
                emitter.explode(30); // emit 30 particles
            }

            // schedule emitter cleanup after particles finish
            this.time.delayedCall(700, () => {
                try {
                    emitter.stop();
                } catch (e) {
                }
                if (emitter && emitter.destroy) emitter.destroy();
            });

            this.cameras.main.shake(120, 0.0005);
        });


        this.input.on('pointerdown', (pointer, gameObjects) => {
            if (pointer.rightButtonDown()) {
                this.cancelPlayerAction();
                return;
            }

            if (!pointer.leftButtonDown() || this.isMoving) {
                return;
            }

            if (this.playerActionState === 'move') {
                const gridPos = this.screenToGrid(pointer.worldX, pointer.worldY);
                const targetX = gridPos.x;
                const targetY = gridPos.y;

                if (targetX < 0 || targetX >= this.mapConsts.MAP_SIZE_X || targetY < 0 || targetY >= this.mapConsts.MAP_SIZE_Y) {
                    return;
                }
                const unitOnTile = this.units.find(u => u.gridPos.x === targetX && u.gridPos.y === targetY);
                if (unitOnTile) {
                    return;
                }
                if (this.walkableTiles.includes(this.grid[targetY][targetX])) {
                    this.moveUnit(this.activePlayerUnit, targetX, targetY);
                }
            } else if (this.playerActionState === 'attack' || this.playerActionState === 'long_attack') {
                const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                const targetUnit = this.getUnitAtScreenPos(worldPoint.x, worldPoint.y);
                if (targetUnit && !targetUnit.isPlayer && targetUnit.sprite.tint === 0xff0000) {
                    this.performPlayerAttack(targetUnit);
                }
            }
        });

        // Camera drag with middle mouse button
        this.input.on('pointerdown', (pointer) => {
            if (pointer.middleButtonDown()) {
                this.isMiddleButtonDown = true;
                this.lastCameraX = this.cameras.main.scrollX;
                this.lastCameraY = this.cameras.main.scrollY;
                this.lastPointerX = pointer.x;
                this.lastPointerY = pointer.y;
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (this.isMiddleButtonDown) {
                const dx = pointer.x - this.lastPointerX;
                const dy = pointer.y - this.lastPointerY;

                this.cameras.main.scrollX = this.lastCameraX - dx / this.cameras.main.zoom;
                this.cameras.main.scrollY = this.lastCameraY - dy / this.cameras.main.zoom;
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (this.isMiddleButtonDown) {
                this.isMiddleButtonDown = false;
            }
        });
    }

    performPlayerAttack(targetUnit) {
        const move = this.activePlayerUnit.moves.find(m => m.type === this.playerActionState);
        this.activePlayerUnit.stats.currentAp -= move.cost;
        this.events.emit('unit_stats_changed', this.activePlayerUnit);
        move.currentCooldown = move.cooldown;
        this.activePlayerUnit.usedStandardAction = true;

        this.activePlayerUnit.attack(targetUnit, this.playerActionState);
        this.clearHighlights();
        this.playerActionState = 'SELECTING_ACTION';
        this.events.emit('player_action_completed');
    }

    update(time, delta) {
        this.units.forEach(u => u.update());
        if (this.vignette && this.activePlayerUnit) {
            this.vignette.x = this.activePlayerUnit.sprite.x;
            this.vignette.y = this.activePlayerUnit.sprite.y;
        }

        // --- Hover Indicator Logic ---
        if (this.hoverIndicator) {
            this.hoverIndicator.destroy();
            this.hoverIndicator = null;
        }

        const actionState = this.playerActionState;
        if (actionState === 'move' || actionState === 'attack' || actionState === 'long_attack') {
            const pointer = this.input.activePointer;
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const gridPos = this.screenToGrid(worldPoint.x, worldPoint.y);

            const isTileValid = this.validActionTiles.some(tile => tile.x === gridPos.x && tile.y === gridPos.y);

            if (isTileValid) {
                const color = (actionState === 'move') ? 0xffffff : 0xff0000;
                const screenX = this.origin.x + (gridPos.x - gridPos.y) * this.mapConsts.HALF_WIDTH + 2;
                const screenY = this.origin.y + (gridPos.x + gridPos.y) * this.mapConsts.QUARTER_HEIGHT - 6;
                
                this.hoverIndicator = this.createCornerIsometricIndicator(screenX, screenY, color, 1); // Alpha 1 for solid corners
                this.hoverIndicator.setDepth(9999); // Set a high depth to ensure it's on top
            }
        }
    }

    screenToGrid(screenX, screenY) {
        const dx = screenX - this.origin.x;
        const dy = screenY - this.origin.y;

        const gridX = Math.round((dx / this.mapConsts.HALF_WIDTH + dy / this.mapConsts.QUARTER_HEIGHT) / 2);
        const gridY = Math.round((dy / this.mapConsts.QUARTER_HEIGHT - dx / this.mapConsts.HALF_WIDTH) / 2);

        return {x: gridX, y: gridY};
    }

    createIsometricIndicator(screenX, screenY, color = 0x0000ff, alpha = 0.5) {
        const graphics = this.add.graphics();
        graphics.fillStyle(color, alpha);
        const size = this.mapConsts.TILE_WIDTH * 1;
        graphics.beginPath();
        graphics.moveTo(screenX, screenY - size / 4);
        graphics.lineTo(screenX + size / 2, screenY);
        graphics.lineTo(screenX, screenY + size / 4);
        graphics.lineTo(screenX - size / 2, screenY);
        graphics.closePath();
        graphics.fillPath();
        return graphics;
    }

    createCornerIsometricIndicator(screenX, screenY, color = 0xffffff, alpha = 1) {
        const graphics = this.add.graphics();
        graphics.lineStyle(1, color, alpha);

        const size = this.mapConsts.TILE_WIDTH * 1;
        const halfWidth = size / 2;
        const quarterHeight = size / 4;
        const cornerLengthFraction = 0.2;

        const segHalfW = halfWidth * cornerLengthFraction;
        const segQuarterH = quarterHeight * cornerLengthFraction;

        const V1 = new Phaser.Math.Vector2(screenX, screenY - quarterHeight);
        const V2 = new Phaser.Math.Vector2(screenX + halfWidth, screenY);
        const V3 = new Phaser.Math.Vector2(screenX, screenY + quarterHeight);
        const V4 = new Phaser.Math.Vector2(screenX - halfWidth, screenY);

        // Top corner (V1)
        graphics.beginPath();
        graphics.moveTo(V1.x, V1.y);
        graphics.lineTo(V1.x + segHalfW, V1.y + segQuarterH);
        graphics.strokePath();

        graphics.beginPath();
        graphics.moveTo(V1.x, V1.y);
        graphics.lineTo(V1.x - segHalfW, V1.y + segQuarterH);
        graphics.strokePath();

        // Right corner (V2)
        graphics.beginPath();
        graphics.moveTo(V2.x, V2.y);
        graphics.lineTo(V2.x - segHalfW, V2.y - segQuarterH);
        graphics.strokePath();
        
        graphics.beginPath();
        graphics.moveTo(V2.x, V2.y);
        graphics.lineTo(V2.x - segHalfW, V2.y + segQuarterH);
        graphics.strokePath();

        // Bottom corner (V3)
        graphics.beginPath();
        graphics.moveTo(V3.x, V3.y);
        graphics.lineTo(V3.x - segHalfW, V3.y - segQuarterH);
        graphics.strokePath();
        
        graphics.beginPath();
        graphics.moveTo(V3.x, V3.y);
        graphics.lineTo(V3.x + segHalfW, V3.y - segQuarterH);
        graphics.strokePath();

        // Left corner (V4)
        graphics.beginPath();
        graphics.moveTo(V4.x, V4.y);
        graphics.lineTo(V4.x + segHalfW, V4.y - segQuarterH);
        graphics.strokePath();

        graphics.beginPath();
        graphics.moveTo(V4.x, V4.y);
        graphics.lineTo(V4.x + segHalfW, V4.y + segQuarterH);
        graphics.strokePath();

        return graphics;
    }

    moveUnit(unit, targetX, targetY) {
        if (this.isMoving) {
            return;
        }
        this.clearHighlights();

        this.units.forEach(otherUnit => {
            if (otherUnit !== unit) {
                this.easystar.avoidAdditionalPoint(otherUnit.gridPos.x, otherUnit.gridPos.y);
            }
        });

        this.easystar.findPath(unit.gridPos.x, unit.gridPos.y, targetX, targetY, (path) => {
            if (path && path.length > 1) {
                const truncatedPath = path.slice(0, Math.min(path.length, unit.stats.moveRange + 1));
                this.moveCharacterAlongPath(unit, truncatedPath);
            } else {
                console.log("Path was not found or is too short.");
            }

            this.units.forEach(otherUnit => {
                if (otherUnit !== unit) {
                    this.easystar.stopAvoidingAdditionalPoint(otherUnit.gridPos.x, otherUnit.gridPos.y);
                }
            });
        });
        this.easystar.calculate();
    }

    moveCharacterAlongPath(unit, path, onCompleteCallback) {
        if (!path || path.length <= 1) {
            if (onCompleteCallback) onCompleteCallback();
            return;
        }

        this.isMoving = true;

        if (unit.isPlayer) {
            this.events.emit('player_action_selected');
        }

        const screenPath = path.map(pos => ({
            x: this.origin.x + (pos.x - pos.y) * this.mapConsts.HALF_WIDTH,
            y: this.origin.y + (pos.x + pos.y) * this.mapConsts.QUARTER_HEIGHT,
        }));

        const movementPath = new Phaser.Curves.Path(screenPath[0].x, screenPath[0].y);
        for (let i = 1; i < screenPath.length; i++) {
            movementPath.lineTo(screenPath[i].x, screenPath[i].y);
        }

        const duration = 200 * (path.length - 1);
        const follower = { t: 0, vec: new Phaser.Math.Vector2() };

        this.tweens.add({
            targets: follower,
            t: 1,
            duration: duration,
            ease: 'Linear',
            onUpdate: () => {
                movementPath.getPoint(follower.t, follower.vec);
                unit.sprite.setPosition(follower.vec.x, follower.vec.y);
            },
            onComplete: () => {
                const lastPos = path[path.length - 1];
                unit.gridPos.x = lastPos.x;
                unit.gridPos.y = lastPos.y;
                this.isMoving = false;

                // Stop any existing selection tween on this unit
                if (this.activeUnitTween && this.activePlayerUnit === unit) {
                    this.activeUnitTween.stop();
                }

                // Update the 'originalY' for the new position
                const newOriginalY = this.origin.y + (lastPos.x + lastPos.y) * this.mapConsts.QUARTER_HEIGHT;
                unit.sprite.setY(newOriginalY); // Ensure it's exactly at the final spot.
                unit.sprite.setData('originalY', newOriginalY);

                if (unit.isPlayer) {
                    const move = unit.moves.find(m => m.type === 'move');
                    if (move) {
                        unit.stats.currentAp -= move.cost;
                        move.currentCooldown = move.cooldown;
                    }
                    unit.hasMoved = true;
                    this.events.emit('unit_stats_changed', unit);
                    this.events.emit('player_action_completed');
                    this.playerActionState = 'SELECTING_ACTION';

                    // If this unit is still the active one, restart its bobbing tween
                    if (this.activePlayerUnit === unit) {
                        this.activeUnitTween = this.tweens.add({
                            targets: this.activePlayerUnit.sprite,
                            y: newOriginalY - 5,
                            duration: 500,
                            ease: 'Sine.easeInOut',
                            yoyo: true,
                            repeat: -1
                        });
                    }
                }

                if (onCompleteCallback) onCompleteCallback();
            }
        });
    }

    buildTurnOrder() {
        this.turnOrder = [...this.units].sort((a, b) => b.stats.speed - a.stats.speed);
    }

    updateCooldowns(unit) {
        unit.moves.forEach(move => {
            if (move.currentCooldown > 0) {
                move.currentCooldown--;
            }
        });
    }

    startNextTurn() {
        if (this.turnOrder.length === 0) return;

        if (this.turnIndex >= this.turnOrder.length) {
            this.turnIndex = 0;
            // New round is starting, update all cooldowns
            this.units.forEach(unit => this.updateCooldowns(unit));
        }

        const currentUnit = this.turnOrder[this.turnIndex];
        this.events.emit('turn_changed', this.turnIndex);

        if (currentUnit.isPlayer) {
            this.startPlayerUnitTurn(currentUnit);
        } else {
            this.startEnemyTurn(currentUnit);
        }
    }

    deactivateCurrentPlayerUnitSelection() {
        if (this.activePlayerUnit && this.activePlayerUnit.sprite) {
            this.tweens.killTweensOf(this.activePlayerUnit.sprite);
            this.activePlayerUnit.sprite.setY(this.activePlayerUnit.sprite.getData('originalY'));
        }
        this.activeUnitTween = null; // Clear the reference
        this.activePlayerUnit = null;
        this.playerActionState = null;
        this.clearHighlights(); // Also clear highlights when deselecting
    }

    activatePlayerUnit(unit) {
        // If the same unit is activated again, do nothing.
        if (this.activePlayerUnit === unit) {
            return;
        }

        // Deactivate any previously active unit.
        this.deactivateCurrentPlayerUnitSelection();

        // Kill any lingering tweens (like hover) on the new unit.
        this.tweens.killTweensOf(unit.sprite);

        // Set the new active unit.
        this.activePlayerUnit = unit;
        this.events.emit('player_unit_selected', unit);

        // Start the bobbing selection tween for the new active unit.
        this.activeUnitTween = this.tweens.add({
            targets: this.activePlayerUnit.sprite,
            y: this.activePlayerUnit.sprite.getData('originalY') - 5,
            duration: 500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    }

    startPlayerUnitTurn(unit) {
        this.gameState = 'PLAYER_TURN';
        this.playerActionState = 'SELECTING_ACTION';

        // Set stats for the new turn
        unit.stats.currentAp = unit.stats.maxAp;
        unit.hasMoved = false;
        unit.usedStandardAction = false;
        this.events.emit('unit_stats_changed', unit);

        // Activate the unit, which handles selection and animation
        this.activatePlayerUnit(unit);

        this.events.emit('player_turn_started', this.activePlayerUnit);
    }

    endFullPlayerTurn() {
        this.clearHighlights();
        this.playerActionState = null;
        if (this.activeUnitTween) {
            this.activeUnitTween.stop();
            if (this.activePlayerUnit && this.activePlayerUnit.sprite) {
                 this.activePlayerUnit.sprite.setY(this.activePlayerUnit.sprite.getData('originalY'));
            }
        }
        this.activePlayerUnit = null;
        this.playerUnits.forEach(unit => this.updateCooldowns(unit));
        this.events.emit('player_turn_ended');

        // Find the next enemy in the turn order, starting from the current position
        let nextIndex = (this.turnIndex + 1) % this.turnOrder.length;
        let looped = false;
        while (nextIndex !== this.turnIndex || !looped) {
            if(nextIndex === this.turnIndex) looped = true;
            if (!this.turnOrder[nextIndex].isPlayer) {
                this.turnIndex = nextIndex;
                this.startNextTurn();
                return;
            }
            nextIndex = (nextIndex + 1) % this.turnOrder.length;
        }

        // If no enemy was found in a full loop, it means there are no enemies.
        // We should start the next round with the first unit.
        this.turnIndex = 0;
        this.startNextTurn();
    }

    onActionSelected(move) {
        if (move.currentCooldown > 0) return;
        if (move.type === 'attack' && this.activePlayerUnit.usedStandardAction) return;
        if (move.type === 'long_attack' && this.activePlayerUnit.usedStandardAction) return;
        if (move.type === 'move' && this.activePlayerUnit.hasMoved) return;
        if (this.activePlayerUnit.stats.currentAp < move.cost) return;

        this.playerActionState = move.type;
        this.events.emit('player_action_selected');

        if (move.type === 'attack' || move.type === 'long_attack') {
            this.highlightRange(this.activePlayerUnit.gridPos, move.range, 0xff0000);
            this.highlightAttackableEnemies(move.range);
        } else if (move.type === 'move') {
            this.highlightRange(this.activePlayerUnit.gridPos, move.range, 0x0000ff);
        }
    }

    cancelPlayerAction() {
        if (this.gameState === 'PLAYER_TURN' && this.playerActionState !== 'SELECTING_ACTION') {
            this.clearHighlights();
            this.playerActionState = 'SELECTING_ACTION';
            this.events.emit('action_cancelled');
        }
    }

    highlightRange(startPos, range, color) {
        this.clearHighlights();
        const openList = [{pos: startPos, cost: 0}];
        const closedList = new Set();
        closedList.add(`${startPos.x},${startPos.y}`);

        const enemyPositions = new Set();
        if (color === 0x0000ff) { // Only avoid enemies for move highlights
            this.units.forEach(unit => {
                if (unit !== this.activePlayerUnit) {
                    enemyPositions.add(`${unit.gridPos.x},${unit.gridPos.y}`);
                }
            });
        }


        while (openList.length > 0) {
            const current = openList.shift();
            if (current.cost >= range) continue;
            const neighbors = [
                {x: current.pos.x + 1, y: current.pos.y}, {x: current.pos.x - 1, y: current.pos.y},
                {x: current.pos.x, y: current.pos.y + 1}, {x: current.pos.x, y: current.pos.y - 1}
            ];

            for (const neighbor of neighbors) {
                const posKey = `${neighbor.x},${neighbor.y}`;
                if (closedList.has(posKey)) continue;

                if (enemyPositions.has(posKey)) continue;

                if (neighbor.x >= 0 && neighbor.x < this.mapConsts.MAP_SIZE_X &&
                    neighbor.y >= 0 && neighbor.y < this.mapConsts.MAP_SIZE_Y &&
                    this.walkableTiles.includes(this.grid[neighbor.y][neighbor.x])) {

                    closedList.add(posKey);
                    openList.push({pos: neighbor, cost: current.cost + 1});
                    this.validActionTiles.push(neighbor); // Store the valid tile

                    const screenX = this.origin.x + (neighbor.x - neighbor.y) * this.mapConsts.HALF_WIDTH + 2;
                    const screenY = this.origin.y + (neighbor.x + neighbor.y) * this.mapConsts.QUARTER_HEIGHT - 6;
                    const indicator = this.createIsometricIndicator(screenX, screenY, color, 0.2);
                    indicator.disableInteractive();
                    indicator.setDepth(neighbor.x + neighbor.y + 0.5);
                    this.rangeHighlights.push(indicator);
                }
            }
        }
    }

    highlightAttackableEnemies(range) {
        const enemies = this.units.filter(u => !u.isPlayer);
        for (const enemy of enemies) {
            const distance = Math.abs(this.activePlayerUnit.gridPos.x - enemy.gridPos.x) + Math.abs(this.activePlayerUnit.gridPos.y - enemy.gridPos.y);
            if (distance <= range) {
                enemy.sprite.setTint(0xff0000);
            }
        }
    }

    clearHighlights() {
        this.units.forEach(u => u.sprite.clearTint());
        if (this.rangeHighlights) {
            this.rangeHighlights.forEach(h => h.destroy());
            this.rangeHighlights = [];
        }
        if (this.hoverIndicator) {
            this.hoverIndicator.destroy();
            this.hoverIndicator = null;
        }
        this.validActionTiles = [];
    }

    getUnitAtScreenPos(screenX, screenY) {
        for (const unit of this.units) {
            if (unit.sprite.getBounds().contains(screenX, screenY)) {
                return unit;
            }
        }
        return null;
    }

    startEnemyTurn(enemy) {
        this.gameState = 'ENEMY_TURN';
        this.takeEnemyTurn(enemy, () => {
            this.turnIndex = (this.turnIndex + 1) % this.turnOrder.length;
            this.startNextTurn();
        });
    }

    takeEnemyTurn(enemy, onTurnComplete) {
        const attackMove = enemy.moves.find(m => m.type === 'attack');

        // Find the closest player unit
        let closestPlayerUnit = null;
        let minDistance = Infinity;
        for (const playerUnit of this.playerUnits) {
            const distance = Math.abs(playerUnit.gridPos.x - enemy.gridPos.x) + Math.abs(playerUnit.gridPos.y - enemy.gridPos.y);
            if (distance < minDistance) {
                minDistance = distance;
                closestPlayerUnit = playerUnit;
            }
        }

        if (!closestPlayerUnit) {
            onTurnComplete();
            return;
        }

        const doAttack = (callback) => {
            const dx = closestPlayerUnit.gridPos.x - enemy.gridPos.x;
            const dy = closestPlayerUnit.gridPos.y - enemy.gridPos.y;
            if (dx < 0 || (dx === 0 && dy < 0)) {
                enemy.sprite.flipX = true;
            } else {
                enemy.sprite.flipX = false;
            }

            enemy.attack(closestPlayerUnit, 'attack');
            if (callback) {
                this.time.delayedCall(300, callback, []);
            }
        };

        const distanceToTarget = Math.abs(closestPlayerUnit.gridPos.x - enemy.gridPos.x) + Math.abs(closestPlayerUnit.gridPos.y - enemy.gridPos.y);

        if (distanceToTarget <= attackMove.range) {
            doAttack(onTurnComplete);
        } else {
            const targetableTiles = [];
            const neighbors = [
                {x: closestPlayerUnit.gridPos.x + 1, y: closestPlayerUnit.gridPos.y}, {
                    x: closestPlayerUnit.gridPos.x - 1,
                    y: closestPlayerUnit.gridPos.y
                },
                {x: closestPlayerUnit.gridPos.x, y: closestPlayerUnit.gridPos.y + 1}, {
                    x: closestPlayerUnit.gridPos.x,
                    y: closestPlayerUnit.gridPos.y - 1
                }
            ];

            const occupiedPositions = new Set(this.units.map(u => `${u.gridPos.x},${u.gridPos.y}`));

            for (const neighbor of neighbors) {
                if (neighbor.x >= 0 && neighbor.x < this.mapConsts.MAP_SIZE_X &&
                    neighbor.y >= 0 && neighbor.y < this.mapConsts.MAP_SIZE_Y &&
                    this.walkableTiles.includes(this.grid[neighbor.y][neighbor.x]) &&
                    !occupiedPositions.has(`${neighbor.x},${neighbor.y}`)) {
                    targetableTiles.push(neighbor);
                }
            }

            if (targetableTiles.length > 0) {
                const target = targetableTiles.sort((a, b) => {
                    const distA = Math.abs(a.x - enemy.gridPos.x) + Math.abs(a.y - enemy.gridPos.y);
                    const distB = Math.abs(b.x - enemy.gridPos.x) + Math.abs(b.y - enemy.gridPos.y);
                    return distA - distB;
                })[0];

                this.units.forEach(unit => {
                    if (unit !== enemy) {
                        this.easystar.avoidAdditionalPoint(unit.gridPos.x, unit.gridPos.y);
                    }
                });
                this.easystar.findPath(enemy.gridPos.x, enemy.gridPos.y, target.x, target.y, (path) => {
                    if (path && path.length > 1) {
                        const truncatedPath = path.slice(0, Math.min(path.length, enemy.stats.moveRange + 1));
                        this.moveCharacterAlongPath(enemy, truncatedPath, () => {
                            const newDistance = Math.abs(closestPlayerUnit.gridPos.x - enemy.gridPos.x) + Math.abs(closestPlayerUnit.gridPos.y - enemy.gridPos.y);
                            if (newDistance <= attackMove.range) {
                                doAttack(onTurnComplete);
                            } else {
                                onTurnComplete();
                            }
                        });
                    } else {
                        onTurnComplete();
                    }
                    this.units.forEach(unit => {
                        if (unit !== enemy) {
                            this.easystar.stopAvoidingAdditionalPoint(unit.gridPos.x, unit.gridPos.y);
                        }
                    });
                });
                this.easystar.calculate();
            } else {
                onTurnComplete();
            }
        }
    }


    onUnitDied(unit) {
        if (unit.isPlayer) {
            const playerUnitIndex = this.playerUnits.indexOf(unit);
            if (playerUnitIndex > -1) {
                this.playerUnits.splice(playerUnitIndex, 1);
            }

            if (this.playerUnits.length === 0) {
                this.scene.stop('ActionUI');
                this.scene.stop('TimelineUI');
                this.scene.start('GameOver');
                return;
            }
        }

        const unitIndex = this.units.indexOf(unit);
        if (unitIndex > -1) {
            this.units.splice(unitIndex, 1);
        }

        this.buildTurnOrder();
        if (this.turnIndex >= this.turnOrder.length) {
            this.turnIndex = 0;
        }
        this.events.emit('turn_changed', this.turnIndex);
    }

        makeUnitInteractive(unit) {
        unit.sprite.setInteractive({ useHandCursor: true });

        // Player unit specific interactions
        if (unit.isPlayer) {
                                    unit.sprite.on('pointerdown', () => {
                                        this.activatePlayerUnit(unit);
                                    });                        }
                    
                        // Hover effects for all units
                        unit.sprite.on('pointerover', () => {
                            // Only apply hover effect if it's a player unit AND not the currently active one
                            if (unit.isPlayer && this.activePlayerUnit !== unit) {
                                // Kill any existing tweens to prevent conflicts before starting the new one.
                                this.tweens.killTweensOf(unit.sprite);
                    
                                // Start the bobbing hover tween
                                this.tweens.add({
                                    targets: unit.sprite,
                                    y: unit.sprite.getData('originalY') - 5, // Float up slightly
                                    duration: 500,
                                    ease: 'Sine.easeInOut',
                                    yoyo: true,
                                    repeat: -1
                                });
                            }
                            
                            const actionUI = this.scene.get('ActionUI');
                            if (!actionUI) return;
                    
                            const stats = unit.stats;
                            const statsText = `Name: ${unit.name}\nHP: ${stats.currentHealth} / ${stats.maxHealth}\nDMG: ${stats.physicalDamage}\nMOV: ${stats.moveRange}`;
                            actionUI.showGameTooltip(statsText, unit.sprite.x, unit.sprite.y, unit.sprite.displayWidth, unit.sprite.displayHeight);
                        });
                    
                        unit.sprite.on('pointerout', () => {
                            // Only reset hover effect if it's a player unit AND not the currently active one
                            if (unit.isPlayer && this.activePlayerUnit !== unit) {
                                // Kill all tweens on the sprite (i.e., the hover tween).
                                this.tweens.killTweensOf(unit.sprite);
                                // Reset the Y position to its original.
                                unit.sprite.setY(unit.sprite.getData('originalY'));
                            }
                    
                            const actionUI = this.scene.get('ActionUI');
                            if (!actionUI) return;
                            actionUI.hideGameTooltip();
                        });
                    }}