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
        this.player = null; // This will hold the player Unit object
        this.units = []; // This will hold all Unit objects
        this.grid = [];
        this.origin = {x: 0, y: 0};
        this.mapConsts = {
            MAP_SIZE_X: 0,
            MAP_SIZE_Y: 0,
            TILE_WIDTH: 62,
            HALF_WIDTH: 0,
            QUARTER_HEIGHT: 0,
        }
        this.rangeHighlights = [];

        this.turnOrder = [];
        this.turnIndex = 0;
        this.playerActionState = null; // e.g., 'SELECTING_ACTION', 'MOVING', 'ATTACKING'
        this.vignette = null;
        this.isMoving = false; // ensure defined
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
                const screenY = this.origin.y + (gridX + gridY) * this.mapConsts.QUARTER_HEIGHT;

                const tileInfo = levelData.tileset[tileType];
                if (tileInfo && tileInfo.assetKey) {
                    const tile = this.add.image(screenX, screenY, tileInfo.assetKey);
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
                    this.player = new Unit(this, {
                        gridX: obj.position.x,
                        gridY: obj.position.y,
                        texture: ASSETS.image.knight.key,
                        name: 'Knight',
                        stats: {maxHealth: 120, currentHealth: 120, moveRange: 4, physicalDamage: 25, speed: 10}
                    });
                    this.units.push(this.player);
                    this.player.animationController.playIdleAnimation();
                    this.makeUnitInteractive(this.player);
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


        // Orc animations
        this.anims.create({
            key: 'orc_idle',
            frames: this.anims.generateFrameNumbers(ASSETS.spritesheet.basic_unit.key, {start: 26, end: 29}),
            frameRate: 4,
            repeat: -1
        });
        this.anims.create({
            key: 'orc_walk',
            frames: this.anims.generateFrameNumbers(ASSETS.spritesheet.basic_unit.key, {start: 30, end: 37}),
            frameRate: 24,
            repeat: -1
        });
        this.anims.create({
            key: 'orc_attack',
            frames: this.anims.generateFrameNumbers(ASSETS.spritesheet.basic_unit.key, {start: 38, end: 40}),
            frameRate: 12,
            repeat: 0
        });

        this.units.forEach(u => {
            if (u !== this.player) u.sprite.play('orc_idle');
        });

        // --- Camera and Input ---
        this.cameras.main.setZoom(4.5);
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.centerOn(this.player.sprite.x, this.player.sprite.y);

        // --- Start Game ---
        this.buildTurnOrder();
        this.scene.launch('TimelineUI', {turnOrder: this.turnOrder});
        this.scene.launch('ActionUI');
        this.scene.launch('PlayerStatsUI');
        this.startNextTurn();

        // --- Event Listeners ---
        this.events.on('unit_stats_changed', (unit) => {
            if (unit === this.player) {
                this.events.emit('player_stats_changed', unit);
            }
        });
        this.events.on('action_selected', this.onActionSelected, this);
        this.events.on('unit_died', this.onUnitDied, this);
        this.events.on('action_cancelled', this.cancelPlayerAction, this);
        this.events.on('skip_turn', this.endPlayerTurn, this);

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
                if (unitOnTile && unitOnTile !== this.player) {
                    return;
                }
                if (this.walkableTiles.includes(this.grid[targetY][targetX])) {
                    this.movePlayer(targetX, targetY);
                }
            } else if (this.playerActionState === 'attack' || this.playerActionState === 'long_attack') {
                const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                const targetUnit = this.getUnitAtScreenPos(worldPoint.x, worldPoint.y);
                if (targetUnit && targetUnit !== this.player && targetUnit.sprite.tint === 0xff0000) {
                    this.performPlayerAttack(targetUnit);
                }
            }
        });
    }

    performPlayerAttack(targetUnit) {
        const move = this.player.moves.find(m => m.type === this.playerActionState);
        this.player.stats.currentAp -= move.cost;
        this.events.emit('unit_stats_changed', this.player);
        move.currentCooldown = move.cooldown;
        this.player.usedStandardAction = true;

        if (this.playerActionState === 'long_attack') {
            this.player.animationController.playCastAnimation(() => {
                this.player.attack(targetUnit, this.playerActionState);
                this.clearHighlights();
                this.playerActionState = 'SELECTING_ACTION';
                this.events.emit('player_action_completed');
            });
        } else {
            this.player.attack(targetUnit, this.playerActionState);
            this.clearHighlights();
            this.playerActionState = 'SELECTING_ACTION';
            this.events.emit('player_action_completed');
        }
    }

    update(time, delta) {
        this.units.forEach(u => u.update());
        if (this.vignette && this.player) {
            this.vignette.x = this.player.sprite.x;
            this.vignette.y = this.player.sprite.y;
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
        screenY = screenY - 6;
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

    movePlayer(targetX, targetY) {
        if (this.isMoving) {
            return;
        }
        this.clearHighlights();

        this.units.forEach(unit => {
            if (unit !== this.player) {
                this.easystar.avoidAdditionalPoint(unit.gridPos.x, unit.gridPos.y);
            }
        });

        this.easystar.findPath(this.player.gridPos.x, this.player.gridPos.y, targetX, targetY, (path) => {
            if (path && path.length > 1) {
                const truncatedPath = path.slice(0, Math.min(path.length, this.player.stats.moveRange + 1));
                this.moveCharacterAlongPath(this.player, truncatedPath);
            } else {
                console.log("Path was not found or is too short.");
            }

            this.units.forEach(unit => {
                if (unit !== this.player) {
                    this.easystar.stopAvoidingAdditionalPoint(unit.gridPos.x, unit.gridPos.y);
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
        unit.animationController.stopAllAnimations();

        if (unit === this.player) {
            this.events.emit('player_action_selected');
        } else {
            unit.sprite.play(unit.name.toLowerCase() + '_walk');
        }

        const screenPath = path.map(pos => ({
            x: this.origin.x + (pos.x - pos.y) * this.mapConsts.HALF_WIDTH,
            y: this.origin.y + (pos.x + pos.y) * this.mapConsts.QUARTER_HEIGHT - 14,
        }));

        unit.animationController.playMoveAnimation(screenPath, () => {
            const lastPos = path[path.length - 1];
            unit.gridPos.x = lastPos.x;
            unit.gridPos.y = lastPos.y;
            this.isMoving = false;

            if (unit === this.player) {
                // spend AP
                const move = this.player.moves.find(m => m.type === 'move');
                if (move) {
                    this.player.stats.currentAp -= move.cost;
                    move.currentCooldown = move.cooldown;
                }

                this.player.hasMoved = true;

                this.events.emit('unit_stats_changed', this.player);
                this.events.emit('player_action_completed');
                this.playerActionState = 'SELECTING_ACTION';
                unit.animationController.playIdleAnimation();

            } else {
                unit.sprite.play(unit.name.toLowerCase() + '_idle');
            }

            if (onCompleteCallback) onCompleteCallback();
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
        }
        const currentUnit = this.turnOrder[this.turnIndex];
        this.events.emit('turn_changed', this.turnIndex);

        if (currentUnit === this.player) {
            this.startPlayerTurn();
        } else {
            this.startEnemyTurn(currentUnit);
        }
    }

    startPlayerTurn() {
        this.gameState = 'PLAYER_TURN';
        this.playerActionState = 'SELECTING_ACTION'; // No action selected initially
        this.updateCooldowns(this.player);
        this.player.stats.currentAp = this.player.stats.maxAp;
        this.player.hasMoved = false;
        this.player.usedStandardAction = false;
        this.events.emit('unit_stats_changed', this.player);
        this.events.emit('player_turn_started', this.player);
    }

    endPlayerTurn() {
        this.clearHighlights();
        this.playerActionState = null;
        this.events.emit('player_turn_ended');
        this.turnIndex = (this.turnIndex + 1) % this.turnOrder.length;
        this.startNextTurn();
    }

    onActionSelected(move) {
        if (move.currentCooldown > 0) return;
        if (move.type === 'attack' && this.player.usedStandardAction) return;
        if (move.type === 'long_attack' && this.player.usedStandardAction) return;
        if (move.type === 'move' && this.player.hasMoved) return;
        if (this.player.stats.currentAp < move.cost) return;

        this.playerActionState = move.type;
        this.events.emit('player_action_selected');

        if (move.type === 'attack' || move.type === 'long_attack') {
            this.highlightRange(this.player.gridPos, move.range, 0xff0000);
            this.highlightAttackableEnemies(move.range);
        } else if (move.type === 'move') {
            this.highlightRange(this.player.gridPos, move.range, 0x0000ff);
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
        const highlights = [];

        const enemyPositions = new Set();
        if (color === 0x0000ff) { // Only avoid enemies for move highlights
            this.units.forEach(unit => {
                if (unit !== this.player) {
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

                    const screenX = this.origin.x + (neighbor.x - neighbor.y) * this.mapConsts.HALF_WIDTH;
                    const screenY = this.origin.y + (neighbor.x + neighbor.y) * this.mapConsts.QUARTER_HEIGHT;
                    const indicator = this.createIsometricIndicator(screenX, screenY, color, 0.2);
                    indicator.disableInteractive();
                    indicator.setDepth(neighbor.x + neighbor.y + 0.5);
                    highlights.push(indicator);
                }
            }
        }
        this.rangeHighlights = highlights;
    }

    highlightAttackableEnemies(range) {
        const enemies = this.units.filter(u => u !== this.player);
        for (const enemy of enemies) {
            const distance = Math.abs(this.player.gridPos.x - enemy.gridPos.x) + Math.abs(this.player.gridPos.y - enemy.gridPos.y);
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
        this.updateCooldowns(enemy);
        this.takeEnemyTurn(enemy, () => {
            this.turnIndex = (this.turnIndex + 1) % this.turnOrder.length;
            this.startNextTurn();
        });
    }

    takeEnemyTurn(enemy, onTurnComplete) {
        const attackMove = enemy.moves.find(m => m.type === 'attack');

        const doAttack = (callback) => {
            const dx = this.player.gridPos.x - enemy.gridPos.x;
            const dy = this.player.gridPos.y - enemy.gridPos.y;
            if (dx < 0 || (dx === 0 && dy < 0)) {
                enemy.sprite.flipX = true;
            } else {
                enemy.sprite.flipX = false;
            }

            enemy.attack(this.player, 'attack');
            if (callback) {
                this.time.delayedCall(300, callback, []);
            }
        };

        const distance = Math.abs(this.player.gridPos.x - enemy.gridPos.x) + Math.abs(this.player.gridPos.y - enemy.gridPos.y);

        if (distance <= attackMove.range) {
            doAttack(onTurnComplete);
        } else {
            const targetableTiles = [];
            const neighbors = [
                {x: this.player.gridPos.x + 1, y: this.player.gridPos.y}, {
                    x: this.player.gridPos.x - 1,
                    y: this.player.gridPos.y
                },
                {x: this.player.gridPos.x, y: this.player.gridPos.y + 1}, {
                    x: this.player.gridPos.x,
                    y: this.player.gridPos.y - 1
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
                            const newDistance = Math.abs(this.player.gridPos.x - enemy.gridPos.x) + Math.abs(this.player.gridPos.y - enemy.gridPos.y);
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
        if (unit === this.player) {
            this.scene.stop('ActionUI');
            this.scene.stop('TimelineUI');
            this.scene.start('GameOver');
            return;
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
        unit.sprite.setInteractive({useHandCursor: true});

        unit.sprite.on('pointerover', () => {
            if (unit === this.player) {
                if (this.isMoving) return;
                unit.animationController.stopAllAnimations();
            }
            const actionUI = this.scene.get('ActionUI');
            if (!actionUI) return;

            const stats = unit.stats;
            const statsText = `Name: ${unit.name}\nHP: ${stats.currentHealth} / ${stats.maxHealth}\nDMG: ${stats.physicalDamage}\nMOV: ${stats.moveRange}`;

            actionUI.showGameTooltip(statsText, unit.sprite.x, unit.sprite.y, unit.sprite.displayWidth, unit.sprite.displayHeight);
        });

        unit.sprite.on('pointerout', () => {
            if (unit === this.player) {
                if (!this.isMoving) {
                    unit.animationController.playIdleAnimation();
                }
            }
            const actionUI = this.scene.get('ActionUI');
            if (!actionUI) return;
            actionUI.hideGameTooltip();
        });
    }
}