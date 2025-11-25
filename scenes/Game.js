import ASSETS from '../assets.js';
import {Unit} from '../gameObjects/Unit.js';
import {LevelGenerator} from "../LevelGenerator.js";
import {Chest} from '../gameObjects/Chest.js';
import {NPC} from '../gameObjects/NPC.js';
import {UNIT_TYPES} from "../gameObjects/unitTypes.js";
import {ABILITIES} from "../gameObjects/abilities.js";
import {Projectile} from "../gameObjects/Projectile.js";
import {testMap} from "../battle_maps/test_map.js";
import {testArmy} from "../enemy_armies/test_army.js";
import {defaultArmy} from "../player_armies/default_army.js";
import {Scenery} from "../gameObjects/Scenery.js";

export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
        this.easystar = null;
        this.activePlayerUnit = null;
        this.playerUnits = [];
        this.units = []; // This will hold all Unit objects
        this.sceneryObjects = [];
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
        this.selectedUnitIndicator = null;

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
        const battleMap = data.battleMap || testMap;
        const enemyArmy = data.enemyArmy || testArmy;
        const playerArmy = data.playerArmy || defaultArmy;

        // Combine map objects and units into a single list for processing
        const combinedObjects = [...battleMap.objects];

        const playerSpawnPoints = [
            {x: 3, y: 10}, {x: 4, y: 10}, {x: 2, y: 10}, {x: 5, y: 10},
            {x: 3, y: 11}, {x: 4, y: 11}, {x: 2, y: 11}, {x: 5, y: 11},
        ];

        playerArmy.units.forEach((unitType, index) => {
            if (index < playerSpawnPoints.length) {
                combinedObjects.push({
                    type: 'unit',
                    unitType: unitType,
                    position: playerSpawnPoints[index]
                });
            }
        });

        const enemySpawnPoints = [
            {x: 3, y: 1}, {x: 4, y: 1}, {x: 2, y: 1}, {x: 5, y: 1},
            {x: 3, y: 2}, {x: 4, y: 2}, {x: 2, y: 2}, {x: 5, y: 2},
        ];

        enemyArmy.units.forEach((unitType, index) => {
            if (index < enemySpawnPoints.length) {
                combinedObjects.push({
                    type: 'unit',
                    unitType: unitType,
                    position: enemySpawnPoints[index]
                });
            }
        });

        const levelConfig = {
            ...battleMap,
            objects: combinedObjects
        };

        const levelData = LevelGenerator.generate(levelConfig);


        this.mapConsts.HALF_WIDTH = this.mapConsts.TILE_WIDTH / 2;
        this.mapConsts.QUARTER_HEIGHT = this.mapConsts.TILE_WIDTH / 4;
        this.mapConsts.MAP_SIZE_X = levelData.mapSize.width;
        this.mapConsts.MAP_SIZE_Y = levelData.mapSize.height;

        // Add the combat background image
        const { width, height } = this.scale;
        const bgImage = this.add.image(width / 2, height / 2, 'bg_fights');

        const scaleX = width / bgImage.width;
        const scaleY = height / bgImage.height;
        const scale = Math.max(scaleX, scaleY);
        bgImage.setScale(scale).setDepth(-1).setScrollFactor(0);

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

        // Make scenery objects non-walkable
        levelData.objects.forEach(obj => {
            if (obj.type === 'scenery') {
                this.easystar.avoidAdditionalPoint(obj.position.x, obj.position.y);
            }
        });


        // --- Map Rendering & Forest Particles ---
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

                    // Check for forest tile type and add particles randomly
                    if (tileInfo.assetKey.startsWith('base_') && Math.random() < 0.3) {
                        const tileWidth = tile.displayWidth;
                        const tileHeight = tile.displayHeight;

                        const emitter = this.add.particles(screenX, screenY, 'pixel', {
                            emitZone: { source: new Phaser.Geom.Rectangle(-tileWidth / 2, -tileHeight / 2, tileWidth, tileHeight) },
                            lifespan: { min: 2000, max: 4000 },
                            speedY: { min: -5, max: -10 },
                            speedX: { min: -5, max: 5 },
                            scale: { start: 1, end: 0 },
                            alpha: { start: 0.6, end: 0 },
                            tint: 0x90EE90,
                            quantity: 1,
                            frequency: 300, 
                            blendMode: 'ADD'
                        });
                        emitter.setDepth(99999);
                    }
                }
            }
        }

        // --- Object Creation from Config ---
        levelData.objects.forEach(obj => {
            const screenX = this.origin.x + (obj.position.x - obj.position.y) * this.mapConsts.HALF_WIDTH;
            const screenY = this.origin.y + (obj.position.x + obj.position.y) * this.mapConsts.QUARTER_HEIGHT;

            switch (obj.type) {
                case 'unit':
                    const unitType = UNIT_TYPES[obj.unitType];
                    if (unitType) {
                        // Deep copy stats and moves to prevent shared references
                        const stats = { ...unitType.stats };
                        const moves = unitType.moves.map(abilityKey => {
                            const abilityTemplate = ABILITIES[abilityKey];
                            const move = { ...abilityTemplate };
                            // Special handling for MOVE ability to set range from unit stats
                            if (move.type === 'move') {
                                move.range = stats.moveRange;
                            }
                            return move;
                        });

                        const unit = new Unit(this, {
                            gridX: obj.position.x,
                            gridY: obj.position.y,
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
                        this.makeUnitInteractive(unit);
                    }
                    break;
                case 'scenery':
                    const scenery = new Scenery(this, {
                        x: screenX,
                        y: screenY,
                        texture: obj.assetKey,
                        depth: screenY,
                        gridPos: obj.position
                    });
                    this.sceneryObjects.push(scenery);
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
        this.cameras.main.setZoom(2);
        this.cameras.main.setRoundPixels(true);

        const mapWidthInTiles = this.mapConsts.MAP_SIZE_X;
        const mapHeightInTiles = this.mapConsts.MAP_SIZE_Y;
        const tileHalfWidth = this.mapConsts.HALF_WIDTH;
        const tileQuarterHeight = this.mapConsts.QUARTER_HEIGHT;

        // Calculate the world coordinates of the map's bounding box
        const worldMinX = this.origin.x - (mapHeightInTiles) * tileHalfWidth;
        const worldMaxX = this.origin.x + (mapWidthInTiles) * tileHalfWidth;
        const worldMinY = this.origin.y - 100; //- (mapHeightInTiles) * tileQuarterHeight;
        const worldMaxY = this.origin.y + (mapWidthInTiles + mapHeightInTiles) * tileQuarterHeight;

        const mapWorldWidth = worldMaxX - worldMinX;
        const mapWorldHeight = worldMaxY - worldMinY;

        const padding = 200; // Allow moving "a bit on each side"

        this.cameras.main.setBounds(
            worldMinX - padding,
            worldMinY - padding,
            mapWorldWidth + padding * 2,
            mapWorldHeight + padding * 2
        );

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


        this.input.on('pointerdown', (pointer) => {
            if (this.gameState !== 'PLAYER_TURN' || this.isMoving) return;
        
            if (pointer.middleButtonDown()) {
                this.isMiddleButtonDown = true;
                this.lastCameraX = this.cameras.main.scrollX;
                this.lastCameraY = this.cameras.main.scrollY;
                this.lastPointerX = pointer.x;
                this.lastPointerY = pointer.y;
                return;
            }
            if (pointer.rightButtonDown()) {
                this.cancelPlayerAction();
                return;
            }
        
            if (pointer.leftButtonDown()) {
                const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                const gridPos = this.screenToGrid(worldPoint.x, worldPoint.y);
        
                if (gridPos.x < 0 || gridPos.x >= this.mapConsts.MAP_SIZE_X || gridPos.y < 0 || gridPos.y >= this.mapConsts.MAP_SIZE_Y) {
                    return; // Click outside map bounds
                }
        
                // Check if the tile is a valid action tile for the current state
                const isTileValid = this.validActionTiles.some(tile => tile.x === gridPos.x && tile.y === gridPos.y);
                if (!isTileValid) {
                    return; // Clicked on an invalid tile for the current action
                }
        
                // --- Handle action based on state ---
                if (this.playerActionState === 'move') {
                    this.moveUnit(this.activePlayerUnit, gridPos.x, gridPos.y);
        
                } else if (this.playerActionState === 'attack' || this.playerActionState === 'arrow_attack') {
                    const targetUnit = this.getUnitAtGridPos(gridPos);
                    if (targetUnit && !targetUnit.isPlayer && targetUnit.sprite.tintTopLeft === 0xff0000) { // Check tint, which confirms it's a valid highlighted target
                        this.performPlayerAttack(targetUnit);
                    }
        
                } else if (this.playerActionState === 'enhance_armor') {
                    const targetUnit = this.getUnitAtGridPos(gridPos);
                    if (targetUnit && targetUnit.isPlayer && targetUnit.sprite.tintTopLeft === 0x00ff00) { // Check tint
                        this.performEnhanceArmor(targetUnit);
                    }
                }
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

        // Add a persistent tween for the hover indicator animation
        this.hoverAnimY = 0;
        this.tweens.add({
            targets: this,
            yoyo: true,
            hoverAnimY: -2, // Move up by 3 pixels (less pronounced)
            duration: 500, // Animation duration
            ease: 'Sine.easeInOut', // Smooth easing
            repeat: -1 // Loop indefinitely (animates up, then snaps back and repeats)
        });

        // Disable the browser's context menu on right-click
        this.input.mouse.disableContextMenu();

        // --- Vignette ---
        const vignetteTexture = this.textures.createCanvas('vignetteCanvas', width, height);
        const canvas = vignetteTexture.canvas;
        const context = vignetteTexture.context;

        const outerRadius = Math.sqrt(width * width + height * height) / 2;
        const innerRadius = width / 3;

        const grd = context.createRadialGradient(width / 2, height / 2, innerRadius, width / 2, height / 2, outerRadius);
        grd.addColorStop(0, 'rgba(0,0,0,0)');
        grd.addColorStop(1, 'rgba(0,0,0,0.5)');

        context.fillStyle = grd;
        context.fillRect(0, 0, width, height);

        vignetteTexture.refresh(); // Refresh the texture
        const vignetteImage = this.add.image(width / 2, height / 2, 'vignetteCanvas');
        vignetteImage.setDepth(10000).setScrollFactor(0);
    }

    performEnhanceArmor(targetUnit) {
        const move = this.activeMove;
        if (!move) return;
    
        this.activePlayerUnit.stats.currentAp -= move.cost;
        this.events.emit('unit_stats_changed', this.activePlayerUnit);
        move.currentCooldown = move.cooldown;
    
        targetUnit.addStatusEffect({ type: 'armor_up', duration: move.duration, amount: move.amount });
        
        this.clearHighlights();
        this.playerActionState = 'SELECTING_ACTION';
        this.events.emit('player_action_completed');
    }
    
    performPlayerAttack(targetUnit) {
        const move = this.activeMove;
        if (!move) return;

        this.activePlayerUnit.stats.currentAp -= move.cost;
        this.events.emit('unit_stats_changed', this.activePlayerUnit);
        move.currentCooldown = move.cooldown;
        this.activePlayerUnit.usedStandardAction = true;

        const onHit = () => {
            const damageInfo = this.activePlayerUnit.calculateDamage(targetUnit);
            targetUnit.takeDamage(damageInfo, this.activePlayerUnit, move);
            this.clearHighlights();
            this.playerActionState = 'SELECTING_ACTION';
            this.events.emit('player_action_completed');
        };

        if (move.type === 'arrow_attack') {
            const projectile = new Projectile(
                this,
                this.activePlayerUnit.sprite.x,
                this.activePlayerUnit.sprite.y - 24, // Start from near the unit's head
                ASSETS.image.arrow_projectile.key,
                targetUnit.sprite,
                onHit
            );
            projectile.setDepth(9999);
        } else {
            this.activePlayerUnit.attack(targetUnit, onHit);
        }
    }
    update(time, delta) {
        this.units.forEach(u => u.update());
        if (this.vignette && this.activePlayerUnit) {
            this.vignette.x = this.activePlayerUnit.sprite.x;
            this.vignette.y = this.activePlayerUnit.sprite.y;
        }

        // --- Scenery Transparency Logic ---
        this.sceneryObjects.forEach(scenery => {
            scenery.sprite.alpha = 1;
        });

        this.units.forEach(unit => {
            this.sceneryObjects.forEach(scenery => {
                // Check if the unit is on the tile directly "behind" the scenery object in grid coordinates
                // (same x, and y is one greater for the unit, meaning it's visually below/behind the tree)
                if (unit.gridPos.x === scenery.gridPos.x -1 && unit.gridPos.y === scenery.gridPos.y - 1) {
                    scenery.sprite.alpha = 0.5;
                }
            });
        });


        // --- Hover Indicator Logic ---
        if (this.hoverIndicator) {
            this.hoverIndicator.destroy();
            this.hoverIndicator = null;
        }

        const actionState = this.playerActionState;
        if (actionState === 'move' || actionState === 'attack' || actionState === 'arrow_attack' || actionState === 'enhance_armor') {
            const pointer = this.input.activePointer;
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const gridPos = this.screenToGrid(worldPoint.x, worldPoint.y);

            const isTileValid = this.validActionTiles.some(tile => tile.x === gridPos.x && tile.y === gridPos.y);

            if (isTileValid) {
                let color = 0xffffff; // Default for move
                if (actionState === 'attack' || actionState === 'arrow_attack') color = 0xff0000;
                if (actionState === 'enhance_armor') color = 0x00ff99;

                const screenX = this.origin.x + (gridPos.x - gridPos.y) * this.mapConsts.HALF_WIDTH + 2;
                const screenY = this.origin.y + (gridPos.x + gridPos.y) * this.mapConsts.QUARTER_HEIGHT - 6;

                // Use the animated value to offset the Y position
                const animatedY = screenY + this.hoverAnimY;

                this.hoverIndicator = this.createCornerIsometricIndicator(screenX, animatedY, color, 1);
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
        
            this.events.emit('unit_is_moving');
        
            if (unit.isPlayer) {            this.events.emit('player_action_selected');
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

                // --- NEW: Update the selected unit indicator ---
                if (this.selectedUnitIndicator && this.activePlayerUnit === unit) {
                    this.selectedUnitIndicator.destroy();
                    const screenX = this.origin.x + (lastPos.x - lastPos.y) * this.mapConsts.HALF_WIDTH;
                    const screenY = this.origin.y + (lastPos.x + lastPos.y) * this.mapConsts.QUARTER_HEIGHT;
                    // Applying the user's manual offset here for consistency
                    this.selectedUnitIndicator = this.createCornerIsometricIndicator(screenX, screenY - 7, 0x0000ff);
                    this.selectedUnitIndicator.setDepth(unit.sprite.depth - 0.25);
                }

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

        if (this.turnIndex === 0) {
            // New round is starting, update all cooldowns
            this.units.forEach(unit => this.updateCooldowns(unit));
        }

        const currentUnit = this.turnOrder[this.turnIndex];

        // Decrement status effect durations for the current unit
        currentUnit.statusEffects.forEach(effect => {
            effect.duration--;
        });
        // Remove expired effects
        currentUnit.statusEffects = currentUnit.statusEffects.filter(effect => effect.duration > 0);

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
        if (this.selectedUnitIndicator) { // NEW: Destroy indicator
            this.selectedUnitIndicator.destroy();
            this.selectedUnitIndicator = null;
        }
        this.activeUnitTween = null; // Clear the reference
        this.activePlayerUnit = null;
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

        // --- Add blue corners for the selected unit ---
        const screenX = this.origin.x + (unit.gridPos.x - unit.gridPos.y) * this.mapConsts.HALF_WIDTH;
        const screenY = this.origin.y + (unit.gridPos.x + unit.gridPos.y) * this.mapConsts.QUARTER_HEIGHT;
        this.selectedUnitIndicator = this.createCornerIsometricIndicator(screenX, screenY - 7, 0x0000ff); // Blue color
        this.selectedUnitIndicator.setDepth(unit.sprite.depth - 0.25); // Ensure it's *below* the unit, but above the tile
    }

    startPlayerUnitTurn(unit) {
        this.gameState = 'PLAYER_TURN';
        this.playerActionState = 'SELECTING_ACTION';

        // This is the start of the player phase. Reset all player units.
        this.playerUnits.forEach(pUnit => {
            pUnit.stats.currentAp = pUnit.stats.maxAp;
            pUnit.hasMoved = false;
            pUnit.usedStandardAction = false;
            this.events.emit('unit_stats_changed', pUnit);
        });

        // Activate the specific unit whose turn it is according to the turn order.
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
        if (move.type === 'arrow_attack' && this.activePlayerUnit.usedStandardAction) return;
        if (move.type === 'move' && this.activePlayerUnit.hasMoved) return;
        if (this.activePlayerUnit.stats.currentAp < move.cost) return;

        this.activeMove = move;
        this.playerActionState = move.type;
        this.events.emit('player_action_selected');

        if (move.type === 'attack' || move.type === 'arrow_attack') {
            this.highlightRange(this.activePlayerUnit.gridPos, move.range, 0xff0000);
            this.highlightAttackableEnemies(move.range);
        } else if (move.type === 'move') {
            this.highlightRange(this.activePlayerUnit.gridPos, move.range, 0x0000ff);
        } else if (move.type === 'enhance_armor') {
            this.highlightRange(this.activePlayerUnit.gridPos, move.range, 0x00ff99); // Show ability range
            this.highlightFriendlyTargets(move.range);
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
        
        // Add the starting tile itself as a valid action tile and highlight it
        this.validActionTiles.push(startPos);
        const startScreenX = this.origin.x + (startPos.x - startPos.y) * this.mapConsts.HALF_WIDTH + 2;
        const startScreenY = this.origin.y + (startPos.x + startPos.y) * this.mapConsts.QUARTER_HEIGHT - 6;
        const startIndicator = this.createIsometricIndicator(startScreenX, startScreenY, color, 0.2);
        startIndicator.disableInteractive();
        startIndicator.setDepth(startPos.x + startPos.y + 0.5);
        this.rangeHighlights.push(startIndicator);

        const openList = [{pos: startPos, cost: 0}];
        const closedList = new Set();
        closedList.add(`${startPos.x},${startPos.y}`);

        const enemyPositions = new Set();
        const sceneryPositions = new Set();
        if (color === 0x0000ff) { // Only avoid enemies and scenery for move highlights
            this.units.forEach(unit => {
                if (unit !== this.activePlayerUnit) {
                    enemyPositions.add(`${unit.gridPos.x},${unit.gridPos.y}`);
                }
            });
            this.sceneryObjects.forEach(scenery => {
                sceneryPositions.add(`${scenery.gridPos.x},${scenery.gridPos.y}`);
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

                if (sceneryPositions.has(posKey)) continue;

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

    highlightFriendlyTargets(range) {
        for (const unit of this.playerUnits) {
            // A unit can cast on itself
            const distance = Math.abs(this.activePlayerUnit.gridPos.x - unit.gridPos.x) + Math.abs(this.activePlayerUnit.gridPos.y - unit.gridPos.y);
            if (distance <= range) {
                unit.sprite.setTint(0x00ff00); // Green tint for valid targets
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

    getUnitAtGridPos(gridPos) {
        for (const unit of this.units) {
            if (unit.gridPos.x === gridPos.x && unit.gridPos.y === gridPos.y) {
                return unit;
            }
        }
        return null;
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

            enemy.attack(closestPlayerUnit, () => {
                const damageInfo = enemy.calculateDamage(closestPlayerUnit);
                closestPlayerUnit.takeDamage(damageInfo, enemy, attackMove);
                if (callback) {
                    this.time.delayedCall(300, callback, []);
                }
            });
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

        // This listener handles clicks on this specific unit's sprite
        unit.sprite.on('pointerdown', (pointer) => {
            if (this.isMoving) return;
    
            // Right-click for unit details is always available
            if (pointer.rightButtonDown()) {
                pointer.event.stopPropagation();
                const stats = unit.stats;
                const effects = unit.statusEffects.map(e => `  - ${e.type.replace('_', ' ')} (${e.duration} turns left)`).join('\n') || '  - None';
                const statsText = 
                    `Name: ${unit.name}
                    HP: ${stats.currentHealth} / ${stats.maxHealth}
                    AP: ${stats.currentAp} / ${stats.maxAp}
                    
                    Damage: ${stats.physicalDamage}
                    Crit Chance: ${Math.round(stats.critChance * 100)}%
                    Armor: ${stats.armor}
                    
                    Movement: ${stats.moveRange}
                    Speed: ${stats.speed}
                    
                    Status Effects:
                    ${effects}`;

                const actionUI = this.scene.get('ActionUI');
                if (actionUI) {
                    actionUI.showCenteredTooltip(statsText);
                }
                return;
            }

            // Left-click logic is only for player's turn
            if (this.gameState !== 'PLAYER_TURN') return;
            
            // Stop the event from propagating to the main input handler (for tile clicks)
            pointer.event.stopPropagation();
            
            // If no targeting action is active, this click is for selection.
            if (this.playerActionState === 'SELECTING_ACTION' && unit.isPlayer) {
                this.activatePlayerUnit(unit);
            }
        });

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
        });
    
        unit.sprite.on('pointerout', () => {
            // Only reset hover effect if it's a player unit AND not the currently active one
            if (unit.isPlayer && this.activePlayerUnit !== unit) {
                // Kill all tweens on the sprite (i.e., the hover tween).
                this.tweens.killTweensOf(unit.sprite);
                // Reset the Y position to its original.
                unit.sprite.setY(unit.sprite.getData('originalY'));
            }
        });
    }}