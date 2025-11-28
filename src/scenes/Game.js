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
import {Trap} from "../gameObjects/Trap.js";
export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
        this.easystar = null;
        this.activePlayerUnit = null;
        this.playerUnits = [];
        this.units = []; // This will hold all Unit objects
        this.sceneryObjects = [];
        this.traps = [];
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

        // --- RESTORED: Animation Arrays ---
        this.animTiles = [];
        this.animObjects = [];
    }

    create(data) {
        // --- SCENE STATE RESET ---
        this.playerUnits = [];
        this.units = [];
        this.sceneryObjects = [];
        this.traps = [];
        this.grid = [];
        this.rangeHighlights = [];
        this.validActionTiles = [];
        this.turnOrder = [];
        this.animTiles = [];
        this.animObjects = [];

        this.easystar = null;
        this.activePlayerUnit = null;

        if (this.hoverIndicator) this.hoverIndicator.destroy();
        this.hoverIndicator = null;
        if (this.selectedUnitIndicator) this.selectedUnitIndicator.destroy();
        this.selectedUnitIndicator = null;

        this.turnIndex = 0;
        this.playerActionState = null;
        this.isMoving = false;
        this.isMiddleButtonDown = false;
        this.lastCameraX = 0;
        this.lastCameraY = 0;
        this.lastPointerX = 0;
        this.lastPointerY = 0;
        // --- END STATE RESET ---

        this.level = this.registry.get('level') || 1;

        // --- FIX STARTS HERE ---
        // 1. Deep Copy the data. This breaks the link to the original imported files.
        // If we don't do this, the previous game's modifications persist, causing bugs.
        const battleMap = JSON.parse(JSON.stringify(data.battleMap || testMap));
        const enemyArmy = JSON.parse(JSON.stringify(data.enemyArmy || testArmy));
        const playerArmy = JSON.parse(JSON.stringify(data.playerArmy || defaultArmy));

        // 2. Use the FRESH battleMap.objects array
        const combinedObjects = battleMap.objects;

        const playerSpawnPoints = [
            {x: 3, y: 10}, {x: 4, y: 10}, {x: 2, y: 10}, {x: 5, y: 10},
            {x: 3, y: 11}, {x: 4, y: 11}, {x: 2, y: 11}, {x: 5, y: 11},
        ];

        playerArmy.units.forEach((unitData, index) => {
            if (index < playerSpawnPoints.length) {
                combinedObjects.push({
                    type: 'unit',
                    unitType: unitData.unitName,
                    rarity: unitData.rarity,
                    position: playerSpawnPoints[index]
                });
            }
        });

        const enemySpawnPoints = [
            {x: 3, y: 1}, {x: 4, y: 1}, {x: 2, y: 1}, {x: 5, y: 1},
            {x: 3, y: 2}, {x: 4, y: 2}, {x: 2, y: 2}, {x: 5, y: 2},
        ];

        enemyArmy.units.forEach((unitData, index) => {
            if (index < enemySpawnPoints.length) {
                // Support both string format and object format for enemies
                const unitType = typeof unitData === 'string' ? unitData : unitData.unitName;
                const rarity = typeof unitData === 'string' ? 'common' : (unitData.rarity || 'common');

                combinedObjects.push({
                    type: 'unit',
                    unitType: unitType,
                    rarity: rarity,
                    position: enemySpawnPoints[index],
                    isPlayer: false,
                });
            }
        });

        const levelConfig = {
            ...battleMap,
            objects: combinedObjects
        };
        // --- FIX ENDS HERE ---

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

        // --- Generate Particle Texture ONCE to avoid feedback loops ---
        if (!this.textures.exists('particle')) {
            const particleG = this.make.graphics({ x: 0, y: 0, add: false });
            particleG.fillStyle(0xffffff);
            particleG.fillRect(0, 0, 1, 1);
            particleG.generateTexture('particle', 1, 1);
        }

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

                    // --- RESTORED: Setup Tile Animation Data ---
                    tile.setData('finalY', screenY);
                    tile.setData('gridSum', gridX + gridY); // For diagonal wave
                    tile.y += 300; // Start underground
                    tile.alpha = 0; // Start invisible
                    this.animTiles.push(tile);

                    // Check for forest tile type and add particles randomly
                    if (tileInfo.assetKey.startsWith('base_') && Math.random() < 0.3) {
                        const tileWidth = tile.displayWidth;
                        const tileHeight = tile.displayHeight;

                        // Randomized timing so they don't sync up
                        const randomFrequency = Phaser.Math.Between(1500, 3000);
                        const randomDelay = Math.random() * 2000;

                        const emitter = this.add.particles(screenX, screenY, 'particle', {
                            emitZone: { source: new Phaser.Geom.Rectangle(-tileWidth / 2, -tileHeight / 2, tileWidth, tileHeight) },
                            lifespan: { min: 2000, max: 4000 },
                            speedY: { min: -5, max: -10 },
                            speedX: { min: -5, max: 5 },
                            scale: { start: 1, end: 0 },
                            alpha: { start: 0.6, end: 0 },
                            tint: 0x90EE90,
                            quantity: 1,
                            delay: randomDelay,
                            frequency: randomFrequency,
                            blendMode: 'ADD'
                        });
                        emitter.setDepth(99999);
                    }
                    tile.setInteractive({ pixelPerfect: true }); // Use pixel perfect if you have transparency

                    tile.on('pointerover', () => {
                        tile.setTint(0xffffff);
                        this.tweens.add({
                            targets: tile,
                            y: tile.getData('finalY') - 2, // Use finalY to respect anim
                            duration: 100,
                            ease: 'Sine.easeOut'
                        });
                    });

                    tile.on('pointerout', () => {
                        tile.setTint(tile.getData('originalTint'));
                        this.tweens.add({
                            targets: tile,
                            y: tile.getData('finalY'),
                            duration: 100,
                            ease: 'Sine.easeIn'
                        });
                    });
                }
            }
        }

        // --- Object Creation from Config ---
        levelData.objects.forEach(obj => {
            const screenX = this.origin.x + (obj.position.x - obj.position.y) * this.mapConsts.HALF_WIDTH;
            const screenY = this.origin.y + (obj.position.x + obj.position.y) * this.mapConsts.QUARTER_HEIGHT;

            let createdObject = null;
            let shadowObject = null; // Track shadow if unit

            switch (obj.type) {
                case 'unit':
                    const unitType = UNIT_TYPES[obj.unitType];
                    if (unitType) {
                        // Deep copy stats and moves to prevent shared references
                        const stats = { ...unitType.stats };
                        const moves = unitType.moves.map(abilityKey => {
                            const abilityTemplate = ABILITIES[abilityKey];
                            const move = { ...abilityTemplate };
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
                            isPlayer: obj.isPlayer !== undefined ? obj.isPlayer : unitType.isPlayer,
                            rarity: obj.rarity 
                        });

                        // Add rarity glow
                        if (unit.rarity === 'rare') {
                            unit.sprite.postFX.addGlow(0x0000ff, 2, 0, false, 0.1, 10);
                        } else if (unit.rarity === 'epic') {
                            unit.sprite.postFX.addGlow(0x9400D3, 2, 0, false, 0.1, 10);
                        } else if (unit.rarity === 'legendary') {
                            unit.sprite.postFX.addGlow(0xffd700, 2, 0, false, 0.1, 10);
                        }

                        this.units.push(unit);
                        if (unit.isPlayer) {
                            this.playerUnits.push(unit);
                        }
                        this.makeUnitInteractive(unit);

                        createdObject = unit.sprite;
                        unit.sprite.setData('originalY', screenY);

                        // Grab shadow if it exists so we can animate it too
                        if (unit.shadow) {
                            shadowObject = unit.shadow;
                        }
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
                    createdObject = scenery.sprite;
                    break;
                case 'chest':
                    const chest = new Chest(this, {
                        x: screenX,
                        y: screenY,
                        texture: ASSETS.spritesheet.items.key,
                        frame: 0,
                        depth: screenY,
                        items: obj.items
                    });
                    createdObject = chest.sprite;
                    break;
                case 'npc':
                    const npc = new NPC(this, {
                        x: screenX,
                        y: screenY,
                        texture: ASSETS.spritesheet.npc.key,
                        frame: 0,
                        depth: screenY,
                        npcType: obj.npcType
                    });
                    createdObject = npc.sprite;
                    break;
            }

            // --- RESTORED: Setup Object Animation Data ---
            if (createdObject) {
                createdObject.setData('finalY', screenY);
                createdObject.y -= 300; // Start in the sky
                createdObject.alpha = 0; // Start invisible
                this.animObjects.push(createdObject);

                // If there's a shadow, it also needs to start in the sky
                if (shadowObject) {
                    shadowObject.setData('finalY', screenY);
                    shadowObject.y -= 300;
                    shadowObject.alpha = 0;
                    this.animObjects.push(shadowObject);
                }
            }
        });

        // --- NEW: Hide Health Bars Initially ---
        // This ensures they don't appear floating in the air before the unit drops
        this.units.forEach(u => {
            if (u.healthBar) u.healthBar.visible = false;
        });

        // Set all units as obstacles for pathfinding
        this.units.forEach(unit => {
            this.easystar.avoidAdditionalPoint(unit.gridPos.x, unit.gridPos.y);
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

        // --- RESTORED: Center Camera on the MAP CENTER ---
        // We do this because units are in the sky, so centering on them would look wrong
        const midGridX = (this.mapConsts.MAP_SIZE_X - 1) / 2;
        const midGridY = (this.mapConsts.MAP_SIZE_Y - 1) / 2;
        const mapCenterX = this.origin.x + (midGridX - midGridY) * this.mapConsts.HALF_WIDTH;
        const mapCenterY = this.origin.y + (midGridX + midGridY) * this.mapConsts.QUARTER_HEIGHT;
        this.cameras.main.centerOn(mapCenterX, mapCenterY);


        // --- Start Game ---
        this.buildTurnOrder();
        this.scene.launch('TimelineUI', {turnOrder: this.turnOrder});
        this.scene.launch('ActionUI');
        this.scene.launch('PlayerStatsUI');

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

                } else if (this.playerActionState === 'attack' || this.playerActionState === 'arrow_attack' || this.playerActionState === 'fireball' || this.playerActionState === 'freeze_ball') {
                    const targetUnit = this.getUnitAtGridPos(gridPos);
                    if (targetUnit && !targetUnit.isPlayer && targetUnit.sprite.tintTopLeft === 0xff0000) { // Check tint, which confirms it's a valid highlighted target
                        this.performPlayerAttack(targetUnit);
                    }

                } else if (this.playerActionState === 'enhance_armor') {
                    const targetUnit = this.getUnitAtGridPos(gridPos);
                    if (targetUnit && targetUnit.isPlayer && targetUnit.sprite.tintTopLeft === 0x00ff00) { // Check tint
                        this.performEnhanceArmor(targetUnit);
                    }
                } else if (this.playerActionState === 'arrow_rain') {
                    this.performArrowRain(gridPos);
                } else if (this.playerActionState === 'trap') {
                    this.performTrapPlacement(gridPos);
                } else if (this.playerActionState === 'basic_heal') {
                    const targetUnit = this.getUnitAtGridPos(gridPos);
                    if (targetUnit && targetUnit.isPlayer && targetUnit.sprite.tintTopLeft === 0x00ff00) {
                        this.performHeal(targetUnit);
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

        this.cameras.main.postFX.addVignette(0.5, 0.5, 0.98, 0.4);

        // --- RESTORED: Trigger Entrance Animation ---
        this.animateSceneEntry();
    }

    isTileFree(x, y) {
        // 1. Check Bounds
        if (x < 0 || x >= this.mapConsts.MAP_SIZE_X || y < 0 || y >= this.mapConsts.MAP_SIZE_Y) {
            return false;
        }

        // 2. Check Walls/Void (using your grid layout)
        if (!this.walkableTiles.includes(this.grid[y][x])) {
            return false;
        }

        // 3. Check Scenery
        if (this.sceneryObjects.some(s => s.gridPos.x === x && s.gridPos.y === y)) {
            return false;
        }

        // 4. Check Units (Crucial: Checks ALL units, Player AND Enemy)
        // We act as if every unit is a solid wall
        if (this.units.some(u => u.gridPos.x === x && u.gridPos.y === y)) {
            return false;
        }

        return true;
    }

    // --- RESTORED: Scene Entry Animation Function ---
    animateSceneEntry() {
        const waveSpeed = 60;
        let maxTileDelay = 0;

        this.animTiles.forEach(tile => {
            const delay = tile.getData('gridSum') * waveSpeed;
            if (delay > maxTileDelay) maxTileDelay = delay;

            this.tweens.add({
                targets: tile,
                y: tile.getData('finalY'),
                alpha: 1,
                duration: 600,
                delay: delay,
                ease: 'Back.easeOut'
            });
        });

        this.time.delayedCall(maxTileDelay + 200, () => {
            this.animObjects.forEach((obj, index) => {
                const randomDelay = Math.random() * 300;
                this.tweens.add({
                    targets: obj,
                    y: obj.getData('finalY'),
                    alpha: 1,
                    duration: 800,
                    delay: randomDelay,
                    ease: 'Bounce.easeOut',
                    onComplete: () => {
                        obj.setData('originalY', obj.y);

                        // --- NEW: Reveal Healthbar when unit lands ---
                        // We find the unit associated with this sprite
                        const unit = this.units.find(u => u.sprite === obj);
                        if (unit && unit.healthBar) {
                            unit.healthBar.visible = true;
                        }
                    }
                });
            });

            this.time.delayedCall(1200, () => {
                // --- UPDATE: Start idle here ---
                this.units.forEach(u => u.startIdle());
                this.startNextTurn();
            });
        });
    }

    performEnhanceArmor(targetUnit) {
        const move = this.activeMove;
        if (!move) return;

        this.clearHighlights();

        this.activePlayerUnit.stats.currentAp -= move.cost;
        this.events.emit('unit_stats_changed', this.activePlayerUnit);
        move.currentCooldown = move.cooldown;
        this.activePlayerUnit.usedStandardAction = true;

        targetUnit.addStatusEffect({ type: 'armor_up', duration: move.duration, amount: move.amount });

        this.playerActionState = 'SELECTING_ACTION';
        this.events.emit('player_action_completed');
    }

    performHeal(targetUnit) {
        const move = this.activeMove;
        if (!move) return;

        this.clearHighlights();

        this.activePlayerUnit.stats.currentAp -= move.cost;
        this.events.emit('unit_stats_changed', this.activePlayerUnit);
        move.currentCooldown = move.cooldown;
        this.activePlayerUnit.usedStandardAction = true;

        this.activePlayerUnit.attack(targetUnit, () => {
            const healAmount = this.activePlayerUnit.calculateHeal(move);
            targetUnit.heal(healAmount);

            const emitter = this.add.particles(targetUnit.sprite.x, targetUnit.sprite.y, 'particle', {
                speed: {min: 20, max: 40},
                angle: {min: 0, max: 360},
                scale: {start: 4, end: 0},
                alpha: {start: 0.6, end: 0},
                lifespan: 1000,
                tint: [0x00ff00, 0x00bf00],
                emitting: false
            });
            emitter.setDepth(99999);
            emitter.explode(20);
            this.time.delayedCall(1000, () => emitter.destroy());

            this.playerActionState = 'SELECTING_ACTION';
            this.events.emit('player_action_completed');
        });
    }

    performTrapPlacement(gridPos) {
        const move = this.activeMove;
        if (!move) return;

        this.clearHighlights();

        this.activePlayerUnit.stats.currentAp -= move.cost;
        this.events.emit('unit_stats_changed', this.activePlayerUnit);
        move.currentCooldown = move.cooldown;
        this.activePlayerUnit.usedStandardAction = true;

        const trap = new Trap(this, { gridX: gridPos.x, gridY: gridPos.y });
        this.traps.push(trap);

        this.playerActionState = 'SELECTING_ACTION';
        this.events.emit('player_action_completed');
    }

        performArrowRain(gridPos) {
            const move = this.activeMove;
            if (!move) return;
    
            this.clearHighlights();
    
            this.activePlayerUnit.stats.currentAp -= move.cost;
            this.events.emit('unit_stats_changed', this.activePlayerUnit);
            move.currentCooldown = move.cooldown;
            this.activePlayerUnit.usedStandardAction = true;
    
            const playerUnit = this.activePlayerUnit;
    
            playerUnit.lungeUp(() => {
                // This is the onImpactCallback of lungeUp
                // Create 3 arrows shooting upwards
                for (let i = 0; i < 3; i++) {
                    const projectile = new Projectile(
                        this,
                        playerUnit.sprite.x + (i * 10 - 10),
                        playerUnit.sprite.y - 24,
                        ASSETS.image.arrow_projectile.key,
                        { x: playerUnit.sprite.x, y: playerUnit.sprite.y - 400 },
                        () => {},
                    );
                    projectile.setDepth(9999);
                }
    
                // After a delay, start the arrow rain
                this.time.delayedCall(500, () => {
                    const { width, height } = move.aoe;
                    const enemiesToHit = [];
    
                    for (let y = 0; y < height; y++) {
                        for (let x = 0; x < width; x++) {
                            const tileX = gridPos.x + x;
                            const tileY = gridPos.y + y;
                            const targetUnit = this.getUnitAtGridPos({ x: tileX, y: tileY });
                            if (targetUnit && !targetUnit.isPlayer) {
                                enemiesToHit.push(targetUnit);
                            }
                        }
                    }
    
                    const onHit = (target) => {
                        const damageInfo = this.activePlayerUnit.calculateDamage(target, move);
                        target.takeDamage(damageInfo, this.activePlayerUnit, move);
                    };
    
                    for (let y = 0; y < height; y++) {
                        for (let x = 0; x < width; x++) {
                            const tileX = gridPos.x + x;
                            const tileY = gridPos.y + y;
    
                            const screenX = this.origin.x + (tileX - tileY) * this.mapConsts.HALF_WIDTH;
                            const screenY = this.origin.y + (tileX + tileY) * this.mapConsts.QUARTER_HEIGHT;
    
                            for (let i = 0; i < 3; i++) { // 3 arrows per tile
                                const projectile = new Projectile(
                                    this,
                                    screenX + Phaser.Math.Between(-10, 10),
                                    screenY - 200, // Start from above the screen
                                    ASSETS.image.arrow_projectile.key,
                                    { x: screenX, y: screenY }, // Target position
                                    () => {
                                        const targetUnit = this.getUnitAtGridPos({ x: tileX, y: tileY });
                                        if (targetUnit && !targetUnit.isPlayer && enemiesToHit.includes(targetUnit)) {
                                            onHit(targetUnit);
                                            enemiesToHit.splice(enemiesToHit.indexOf(targetUnit), 1); // only hit once
                                        }
                                    }
                                );
                                projectile.setDepth(9999);
                            }
                        }
                    }
    
                    this.playerActionState = 'SELECTING_ACTION';
                    this.events.emit('player_action_completed');
                });
            });
        }
    performPlayerAttack(targetUnit) {
        const move = this.activeMove;
        if (!move) return;

        this.clearHighlights();

        this.activePlayerUnit.stats.currentAp -= move.cost;
        this.events.emit('unit_stats_changed', this.activePlayerUnit);
        move.currentCooldown = move.cooldown;
        this.activePlayerUnit.usedStandardAction = true;

        const playerUnit = this.activePlayerUnit;
        const targetSpriteX = targetUnit.sprite.x;

        // Determine initial flip for attack
        if (targetSpriteX < playerUnit.sprite.x) { // Target is to the left
            playerUnit.sprite.flipX = true;
        } else { // Target is to the right
            playerUnit.sprite.flipX = false;
        }

        const onHit = () => {
            // Reset flipX after attack animation (assuming default is facing right)
            playerUnit.sprite.flipX = false;

            const damageInfo = playerUnit.calculateDamage(targetUnit, move);
            targetUnit.takeDamage(damageInfo, playerUnit, move);
            if(move.status){
                targetUnit.addStatusEffect(move.status);
            }
            this.playerActionState = 'SELECTING_ACTION';
            this.events.emit('player_action_completed');
        };

        if (move.type === 'arrow_attack') {
            playerUnit.attack(targetUnit, () => {
                const projectile = new Projectile(
                    this,
                    playerUnit.sprite.x, // Use playerUnit.sprite.x
                    playerUnit.sprite.y - 24, // Start from near the unit's head
                    ASSETS.image.arrow_projectile.key,
                    targetUnit.sprite,
                    onHit
                );
                projectile.setDepth(9999);
            });
        } else if (move.type === 'fireball') {
            playerUnit.attack(targetUnit, () => {
                const projectile = new Projectile(
                    this,
                    playerUnit.sprite.x,
                    playerUnit.sprite.y - 24,
                    ASSETS.image.fireball_projectile.key,
                    targetUnit.sprite,
                    onHit
                );
                projectile.setDepth(9999);
            });
        } else if (move.type === 'freeze_ball') {
            playerUnit.attack(targetUnit, () => {
                const projectile = new Projectile(
                    this,
                    playerUnit.sprite.x,
                    playerUnit.sprite.y - 24,
                    ASSETS.image.freeze_ball_projectile.key,
                    targetUnit.sprite,
                    onHit
                );
                projectile.setDepth(9999);
            });
        } else {
            playerUnit.attack(targetUnit, onHit);
        }
    }
    update(time, delta) {
        this.units.forEach(u => u.update());
        if (this.vignette && this.activePlayerUnit) {
            this.vignette.x = this.activePlayerUnit.sprite.x;
            this.vignette.y = this.activePlayerUnit.sprite.y;
        }

        // --- NEW: Update selected unit indicator position ---
        if (this.selectedUnitIndicator && this.activePlayerUnit && this.activePlayerUnit.sprite) {
            const unitSprite = this.activePlayerUnit.sprite;
            // The indicator should follow the unit's sprite, with a fixed offset.
            // The -7 offset was initially applied during creation, so we apply it here too relative to the sprite's current y.
            this.selectedUnitIndicator.x = unitSprite.x;
            this.selectedUnitIndicator.y = unitSprite.y - 7;
            this.selectedUnitIndicator.setDepth(unitSprite.depth - 0.25);
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
        if (actionState === 'move' || actionState === 'attack' || actionState === 'arrow_attack' || actionState === 'enhance_armor' || actionState === 'arrow_rain' || actionState === 'fireball' || actionState === 'freeze_ball') {
            const pointer = this.input.activePointer;
            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const gridPos = this.screenToGrid(worldPoint.x, worldPoint.y);

            const isTileValid = this.validActionTiles.some(tile => tile.x === gridPos.x && tile.y === gridPos.y);

            if (isTileValid) {
                let color = 0xffffff; // Default for move
                if (actionState === 'attack' || actionState === 'arrow_attack' || actionState === 'fireball' || actionState === 'freeze_ball') color = 0xff0000;
                if (actionState === 'enhance_armor') color = 0x00ff99;

                if (actionState === 'arrow_rain') {
                    if (this.hoverIndicator) {
                        this.hoverIndicator.destroy();
                    }
                    const animatedY = this.hoverAnimY;
                    this.hoverIndicator = this.createAOEIndicator(gridPos.x, gridPos.y, 0xff0000, 1);
                    this.hoverIndicator.y += animatedY;
                } else {
                    const screenX = this.origin.x + (gridPos.x - gridPos.y) * this.mapConsts.HALF_WIDTH + 2;
                    const screenY = this.origin.y + (gridPos.x + gridPos.y) * this.mapConsts.QUARTER_HEIGHT - 6;

                    // Use the animated value to offset the Y position
                    const animatedY = screenY + this.hoverAnimY;

                    this.hoverIndicator = this.createCornerIsometricIndicator(screenX, animatedY, color, 1);
                }
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

        // --- SETTINGS FOR SLEEK LOOK ---
        const lineWidth = 2;       // Thinner lines (was 3)
        const legLength = 0.15;    // Shorter legs (was 0.25)
        const padding = 2;         // Push corners out by 2px for "breathing room"

        // 1. Setup Dimensions
        const width = this.mapConsts.TILE_WIDTH + (padding * 2);
        const height = (this.mapConsts.TILE_WIDTH * 0.5) + (padding); // Maintain aspect ratio

        graphics.lineStyle(lineWidth, color, alpha);

        // 2. Calculate relative coordinates
        const halfW = width / 2;
        const halfH = height / 2;

        // The 4 Points of the diamond
        const top = { x: 0, y: -halfH };
        const right = { x: halfW, y: 0 };
        const bottom = { x: 0, y: halfH };
        const left = { x: -halfW, y: 0 };

        // Linear Interpolation Helper
        const lerp = (p1, p2, t) => ({
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t
        });

        // --- DRAWING ---

        // Top Bracket
        const t_left = lerp(top, left, legLength);
        const t_right = lerp(top, right, legLength);
        graphics.beginPath();
        graphics.moveTo(t_left.x, t_left.y);
        graphics.lineTo(top.x, top.y);
        graphics.lineTo(t_right.x, t_right.y);
        graphics.strokePath();

        // Right Bracket
        const r_top = lerp(right, top, legLength);
        const r_btm = lerp(right, bottom, legLength);
        graphics.beginPath();
        graphics.moveTo(r_top.x, r_top.y);
        graphics.lineTo(right.x, right.y);
        graphics.lineTo(r_btm.x, r_btm.y);
        graphics.strokePath();

        // Bottom Bracket
        const b_right = lerp(bottom, right, legLength);
        const b_left = lerp(bottom, left, legLength);
        graphics.beginPath();
        graphics.moveTo(b_right.x, b_right.y);
        graphics.lineTo(bottom.x, bottom.y);
        graphics.lineTo(b_left.x, b_left.y);
        graphics.strokePath();

        // Left Bracket
        const l_btm = lerp(left, bottom, legLength);
        const l_top = lerp(left, top, legLength);
        graphics.beginPath();
        graphics.moveTo(l_btm.x, l_btm.y);
        graphics.lineTo(left.x, left.y);
        graphics.lineTo(l_top.x, l_top.y);
        graphics.strokePath();

        // 3. Position and Depth
        graphics.setPosition(screenX, screenY);
        graphics.setDepth(100);

        return graphics;
    }

    createAOEIndicator(gridX, gridY, color = 0xff0000, alpha = 1) {
        const aoeGraphics = this.add.graphics();
        const { width, height } = this.activeMove.aoe;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tileX = gridX + x;
                const tileY = gridY + y;

                const screenX = this.origin.x + (tileX - tileY) * this.mapConsts.HALF_WIDTH + 2;
                const screenY = this.origin.y + (tileX + tileY) * this.mapConsts.QUARTER_HEIGHT - 6;

                // --- SETTINGS FOR SLEEK LOOK ---
                const lineWidth = 2;       // Thinner lines (was 3)
                const legLength = 0.15;    // Shorter legs (was 0.25)
                const padding = 2;         // Push corners out by 2px for "breathing room"

                // 1. Setup Dimensions
                const indicatorWidth = this.mapConsts.TILE_WIDTH + (padding * 2);
                const indicatorHeight = (this.mapConsts.TILE_WIDTH * 0.5) + (padding); // Maintain aspect ratio

                aoeGraphics.lineStyle(lineWidth, color, alpha);

                // 2. Calculate relative coordinates
                const halfW = indicatorWidth / 2;
                const halfH = indicatorHeight / 2;

                // The 4 Points of the diamond
                const top = { x: screenX, y: screenY - halfH };
                const right = { x: screenX + halfW, y: screenY };
                const bottom = { x: screenX, y: screenY + halfH };
                const left = { x: screenX - halfW, y: screenY };

                // Linear Interpolation Helper
                const lerp = (p1, p2, t) => ({
                    x: p1.x + (p2.x - p1.x) * t,
                    y: p1.y + (p2.y - p1.y) * t
                });

                // --- DRAWING ---

                // Top Bracket
                const t_left = lerp(top, left, legLength);
                const t_right = lerp(top, right, legLength);
                aoeGraphics.beginPath();
                aoeGraphics.moveTo(t_left.x, t_left.y);
                aoeGraphics.lineTo(top.x, top.y);
                aoeGraphics.lineTo(t_right.x, t_right.y);
                aoeGraphics.strokePath();

                // Right Bracket
                const r_top = lerp(right, top, legLength);
                const r_btm = lerp(right, bottom, legLength);
                aoeGraphics.beginPath();
                aoeGraphics.moveTo(r_top.x, r_top.y);
                aoeGraphics.lineTo(right.x, right.y);
                aoeGraphics.lineTo(r_btm.x, r_btm.y);
                aoeGraphics.strokePath();

                // Bottom Bracket
                const b_right = lerp(bottom, right, legLength);
                const b_left = lerp(bottom, left, legLength);
                aoeGraphics.beginPath();
                aoeGraphics.moveTo(b_right.x, b_right.y);
                aoeGraphics.lineTo(bottom.x, bottom.y);
                aoeGraphics.lineTo(b_left.x, b_left.y);
                aoeGraphics.strokePath();

                // Left Bracket
                const l_btm = lerp(left, bottom, legLength);
                const l_top = lerp(left, top, legLength);
                aoeGraphics.beginPath();
                aoeGraphics.moveTo(l_btm.x, l_btm.y);
                aoeGraphics.lineTo(left.x, left.y);
                aoeGraphics.lineTo(l_top.x, l_top.y);
                aoeGraphics.strokePath();
            }
        }
        return aoeGraphics;
    }

    moveUnit(unit, targetX, targetY) {
        if (this.isMoving) {
            return;
        }
        this.clearHighlights();

        const move = this.activeMove;
        if (!move) return;

        unit.stats.currentAp -= move.cost;
        this.events.emit('unit_stats_changed', unit);
        unit.hasMoved = true;

        this.playerActionState = 'SELECTING_ACTION';
        this.events.emit('player_action_completed');

        this.easystar.findPath(unit.gridPos.x, unit.gridPos.y, targetX, targetY, (path) => {
            if (path && path.length > 1) {
                const truncatedPath = path.slice(0, Math.min(path.length, unit.stats.moveRange + 1));
                this.moveCharacterAlongPath(unit, truncatedPath);
            } else {
                console.log("Path was not found or is too short.");
            }
        });
        this.easystar.calculate();
    }

    moveCharacterAlongPath(unit, path, onCompleteCallback) {
        if (!path || path.length <= 1) {
            if (onCompleteCallback) onCompleteCallback();
            return;
        }

        // --- KEY FIX: IMMEDIATE RESERVATION ---
        // 1. Unmark the OLD position in EasyStar immediately
        this.easystar.stopAvoidingAdditionalPoint(unit.gridPos.x, unit.gridPos.y);

        // 2. Identify the Destination
        const lastPos = path[path.length - 1];

        // 3. LOGICALLY move the unit instantly.
        // This prevents other units from pathing here while this unit is tweening.
        unit.gridPos.x = lastPos.x;
        unit.gridPos.y = lastPos.y;

        // 4. Mark the NEW position in EasyStar immediately
        this.easystar.avoidAdditionalPoint(unit.gridPos.x, unit.gridPos.y);
        // --------------------------------------

        unit.stopIdle();
        unit.isMovingSprite = true;
        this.isMoving = true;

        // Visual Helpers
        unit.sprite.setData('prevX', unit.sprite.x);

        // Prepare Path for Tween
        const screenPath = path.map(pos => ({
            x: this.origin.x + (pos.x - pos.y) * this.mapConsts.HALF_WIDTH,
            y: this.origin.y + (pos.x + pos.y) * this.mapConsts.QUARTER_HEIGHT,
        }));

        const movementPath = new Phaser.Curves.Path(screenPath[0].x, screenPath[0].y);
        for (let i = 1; i < screenPath.length; i++) {
            movementPath.lineTo(screenPath[i].x, screenPath[i].y);
        }

        // Animation Logic
        const duration = 200 * (path.length - 1);
        const follower = { t: 0, vec: new Phaser.Math.Vector2() };

        this.tweens.add({
            targets: follower,
            t: 1,
            duration: duration,
            ease: 'Linear',
            onUpdate: () => {
                movementPath.getPoint(follower.t, follower.vec);

                // Add a little hop effect based on progress
                const hopHeight = 8;
                const totalSteps = path.length - 1;
                // Calculate current step index based on t
                const currentStep = Math.floor(follower.t * totalSteps);
                const stepProgress = (follower.t * totalSteps) - currentStep;
                const hopY = Math.sin(stepProgress * Math.PI) * hopHeight;

                unit.sprite.setPosition(follower.vec.x, follower.vec.y - hopY);

                // Handle Shadow
                if (unit.shadow) {
                    unit.shadow.setPosition(follower.vec.x, follower.vec.y);
                }

                // Handle Flip
                if (unit.sprite.x < unit.sprite.getData('prevX')) {
                    unit.sprite.flipX = true;
                } else if (unit.sprite.x > unit.sprite.getData('prevX')) {
                    unit.sprite.flipX = false;
                }
                unit.sprite.setData('prevX', unit.sprite.x);
                unit.sprite.setDepth(follower.vec.y);
            },
            onComplete: () => {
                this.isMoving = false;
                unit.isMovingSprite = false;

                // Snap to final exact screen position
                const finalScreenY = this.origin.y + (lastPos.x + lastPos.y) * this.mapConsts.QUARTER_HEIGHT;
                const finalScreenX = this.origin.x + (lastPos.x - lastPos.y) * this.mapConsts.HALF_WIDTH;

                unit.sprite.setPosition(finalScreenX, finalScreenY);
                unit.sprite.setData('originalY', finalScreenY);
                if(unit.shadow) unit.shadow.setPosition(finalScreenX, finalScreenY);

                unit.startIdle();

                // Trigger traps or events here if needed

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
            if (effect.type === 'burn') {
                currentUnit.takeDamage({ damage: effect.damage, isCrit: false });
            }
        });

        // Handle freeze effect
        const freezeEffect = currentUnit.statusEffects.find(effect => effect.type === 'freeze');
        if (freezeEffect) {
            // Remove the freeze effect after skipping a turn
            currentUnit.statusEffects = currentUnit.statusEffects.filter(effect => effect.type !== 'freeze');
            this.turnIndex = (this.turnIndex + 1) % this.turnOrder.length;
            this.startNextTurn();
            return;
        }

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
            // Only kill tweens on sprite if it was doing something ELSE (like hover)
            // But to be safe, we can restart idle to ensure consistent state
            this.activePlayerUnit.startIdle();
        }
        if (this.selectedUnitIndicator) {
            this.tweens.killTweensOf(this.selectedUnitIndicator);
            this.selectedUnitIndicator.destroy();
            this.selectedUnitIndicator = null;
        }
        this.activeUnitTween = null;
        this.activePlayerUnit = null;
        this.clearHighlights();
    }

    activatePlayerUnit(unit) {
        if (this.activePlayerUnit === unit) {
            return;
        }

        this.deactivateCurrentPlayerUnitSelection();

        // Kill specific interactive tweens (like hover), but we want to ensure Idle runs.
        // Actually, startIdle checks if running.
        // If the unit was hovering, it's currently NOT idling (because hover stops idle).
        // So we should restart idle to be safe, OR let the hover logic handle it.
        // Let's rely on makeUnitInteractive to handle hover/idle states,
        // and here we just set the Active reference.

        // Ensure unit is at baseline Y if not currently tweening
        if(!this.tweens.isTweening(unit.sprite)) {
            unit.startIdle();
        }

        this.activePlayerUnit = unit;
        this.events.emit('player_unit_selected', unit);

        const screenX = this.origin.x + (unit.gridPos.x - unit.gridPos.y) * this.mapConsts.HALF_WIDTH;
        const screenY = this.origin.y + (unit.gridPos.x + unit.gridPos.y) * this.mapConsts.QUARTER_HEIGHT;
        this.selectedUnitIndicator = this.createCornerIsometricIndicator(screenX, screenY - 7, 0x0000ff);
        this.selectedUnitIndicator.setDepth(unit.sprite.depth - 0.25);
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
        if (move.type === 'move' && this.activePlayerUnit.hasMoved) return;
        if (move.type !== 'move' && this.activePlayerUnit.usedStandardAction) return;
        if (this.activePlayerUnit.stats.currentAp < move.cost) return;

        this.activeMove = move;
        this.playerActionState = move.type;
        this.events.emit('player_action_selected');

        if (move.type === 'attack' || move.type === 'arrow_attack' || move.type === 'arrow_rain' || move.type === 'fireball' || move.type === 'freeze_ball') {
            this.highlightRange(this.activePlayerUnit.gridPos, move.range, 0xff0000);
            this.highlightAttackableEnemies(move.range);
        } else if (move.type === 'move') {
            this.highlightRange(this.activePlayerUnit.gridPos, move.range, 0x0000ff);
        } else if (move.type === 'enhance_armor') {
            this.highlightRange(this.activePlayerUnit.gridPos, move.range, 0x00ff99); // Show ability range
            this.highlightFriendlyTargets(move.range);
        } else if (move.type === 'trap') {
            this.highlightRange(this.activePlayerUnit.gridPos, move.range, 0x00ff00);
        } else if (move.type === 'basic_heal') {
            this.highlightRange(this.activePlayerUnit.gridPos, move.range, 0x00ff99);
            this.highlightHealableAllies(move.range);
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
        if (color === 0x00ff00) { // Avoid any unit for trap placement
            this.units.forEach(unit => {
                enemyPositions.add(`${unit.gridPos.x},${unit.gridPos.y}`);
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

    highlightHealableAllies(range) {
        for (const unit of this.playerUnits) {
            const distance = Math.abs(this.activePlayerUnit.gridPos.x - unit.gridPos.x) + Math.abs(this.activePlayerUnit.gridPos.y - unit.gridPos.y);
            if (distance <= range && unit.stats.currentHealth < unit.stats.maxHealth) {
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
        this.units.forEach(u => {
            if (u.statusEffects.length === 0) {
                u.sprite.clearTint();
            }
        });
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
        const getDist = (a, b) => Math.abs(a.gridPos.x - b.gridPos.x) + Math.abs(a.gridPos.y - b.gridPos.y);

        // --- 1. Identify Valid Targets ---
        // Filter out dead units
        const potentialTargets = this.playerUnits.filter(p => p.stats.currentHealth > 0);

        // Sort by health (weakest first) or distance
        potentialTargets.sort((a, b) => a.stats.currentHealth - b.stats.currentHealth);

        if (potentialTargets.length === 0) {
            onTurnComplete();
            return;
        }

        const closestTarget = potentialTargets[0]; // Simplification: focus on one target

        // --- 2. Check for Attack Opportunity (Standing Still) ---
        // Can I attack anyone from where I am right now?
        const attackMove = enemy.moves.find(m => ['attack', 'arrow_attack', 'fireball', 'freeze_ball'].includes(m.type));
        if (attackMove) {
            const targetInRange = potentialTargets.find(p => getDist(enemy, p) <= attackMove.range);
            if (targetInRange) {
                this.performEnemyAttack(enemy, targetInRange, attackMove, onTurnComplete);
                return;
            }
        }

        const isRanged = attackMove && attackMove.range > 1;

        if (isRanged) {
            // For ranged units, just move towards the target to get in range.
            this.easystar.stopAvoidingAdditionalPoint(closestTarget.gridPos.x, closestTarget.gridPos.y);
            this.easystar.findPath(enemy.gridPos.x, enemy.gridPos.y, closestTarget.gridPos.x, closestTarget.gridPos.y, (path) => {
                this.easystar.avoidAdditionalPoint(closestTarget.gridPos.x, closestTarget.gridPos.y); // Restore avoidance

                if (path && path.length > 2) { // Need at least start, one step, and target
                    const pathToFollow = path.slice(0, path.length - 1); // Exclude target's tile
                    const truncatedPath = pathToFollow.slice(0, Math.min(pathToFollow.length, enemy.stats.moveRange + 1));

                    this.moveCharacterAlongPath(enemy, truncatedPath, () => {
                        // After moving, check again if can attack.
                        if (attackMove && getDist(enemy, closestTarget) <= attackMove.range) {
                            this.performEnemyAttack(enemy, closestTarget, attackMove, onTurnComplete);
                        } else {
                            onTurnComplete();
                        }
                    });
                } else {
                    // No path or path is too short to move.
                    onTurnComplete();
                }
            });
            this.easystar.calculate();
            return;
        }
        
        // --- 3. Find Best Movement Tile for Melee ---
        const targetNeighbors = [
            {x: closestTarget.gridPos.x + 1, y: closestTarget.gridPos.y},
            {x: closestTarget.gridPos.x - 1, y: closestTarget.gridPos.y},
            {x: closestTarget.gridPos.x, y: closestTarget.gridPos.y + 1},
            {x: closestTarget.gridPos.x, y: closestTarget.gridPos.y - 1}
        ];
        const validDestinations = targetNeighbors.filter(pos => this.isTileFree(pos.x, pos.y));
        if (validDestinations.length === 0) {
            // Fallback: No adjacent spot is free. Move towards the player anyway.
            this.easystar.stopAvoidingAdditionalPoint(closestTarget.gridPos.x, closestTarget.gridPos.y);
            this.easystar.findPath(enemy.gridPos.x, enemy.gridPos.y, closestTarget.gridPos.x, closestTarget.gridPos.y, (path) => {
                this.easystar.avoidAdditionalPoint(closestTarget.gridPos.x, closestTarget.gridPos.y); // Restore avoidance

                if (path && path.length > 2) { // Need at least start, one step, and target
                    const pathToFollow = path.slice(0, path.length - 1); // Exclude target's tile
                    const truncatedPath = pathToFollow.slice(0, Math.min(pathToFollow.length, enemy.stats.moveRange + 1));

                    this.moveCharacterAlongPath(enemy, truncatedPath, () => {
                        // After moving, check again if can attack.
                        if (attackMove && getDist(enemy, closestTarget) <= attackMove.range) {
                            this.performEnemyAttack(enemy, closestTarget, attackMove, onTurnComplete);
                        } else {
                            onTurnComplete();
                        }
                    });
                } else {
                    // No path or path is too short to move.
                    onTurnComplete();
                }
            });
            this.easystar.calculate();
            return;
        }

        // Sort destinations by distance to the enemy (find the closest one to me)
        validDestinations.sort((a, b) => {
            const distA = Math.abs(a.x - enemy.gridPos.x) + Math.abs(a.y - enemy.gridPos.y);
            const distB = Math.abs(b.x - enemy.gridPos.x) + Math.abs(b.y - enemy.gridPos.y);
            return distA - distB;
        });

        const chosenTile = validDestinations[0];

        // --- 4. Execute Move ---
        // We use EasyStar to find the path to that specific open tile
        this.easystar.findPath(enemy.gridPos.x, enemy.gridPos.y, chosenTile.x, chosenTile.y, (path) => {
            if (path && path.length > 1) {
                const truncatedPath = path.slice(0, Math.min(path.length, enemy.stats.moveRange + 1));

                // Double check the end of the path is still free (paranoid check)
                const dest = truncatedPath[truncatedPath.length-1];
                if (!this.isTileFree(dest.x, dest.y)) {
                    onTurnComplete();
                    return;
                }

                this.moveCharacterAlongPath(enemy, truncatedPath, () => {
                    // Turn finished moving, now try to attack
                    if (attackMove && getDist(enemy, closestTarget) <= attackMove.range) {
                        this.performEnemyAttack(enemy, closestTarget, attackMove, onTurnComplete);
                    } else {
                        onTurnComplete();
                    }
                });
            } else {
                // No path found
                onTurnComplete();
            }
        });
        this.easystar.calculate();
    }
    getAllWalkableTilesInRange(startPos, range) {
        const tiles = [];
        const openList = [{ pos: startPos, cost: 0 }];
        const closedList = new Set([`${startPos.x},${startPos.y}`]);
        const allOtherUnits = this.units.map(u => `${u.gridPos.x},${u.gridPos.y}`);

        while(openList.length > 0) {
            const current = openList.shift();
            if (current.cost < range) {
                const neighbors = [
                    { x: current.pos.x + 1, y: current.pos.y }, { x: current.pos.x - 1, y: current.pos.y },
                    { x: current.pos.x, y: current.pos.y + 1 }, { x: current.pos.x, y: current.pos.y - 1 }
                ];
                for (const neighbor of neighbors) {
                    const posKey = `${neighbor.x},${neighbor.y}`;
                    if (!closedList.has(posKey) &&
                        neighbor.x >= 0 && neighbor.x < this.mapConsts.MAP_SIZE_X &&
                        neighbor.y >= 0 && neighbor.y < this.mapConsts.MAP_SIZE_Y &&
                        this.walkableTiles.includes(this.grid[neighbor.y][neighbor.x]) &&
                        !allOtherUnits.includes(posKey)
                    ) {
                        closedList.add(posKey);
                        tiles.push(neighbor);
                        openList.push({ pos: neighbor, cost: current.cost + 1 });
                    }
                }
            }
        }
        return tiles;
    }

    performEnemyHeal(enemy, target, healMove, callback) {
        // Similar to performEnemyAttack but for healing
        enemy.attack(target, () => { // Using attack animation for visual feedback
            const healAmount = enemy.calculateHeal(healMove);
            target.heal(healAmount);
            const emitter = this.add.particles(target.sprite.x, target.sprite.y, 'particle', {
                speed: {min: 20, max: 40},
                angle: {min: 0, max: 360},
                scale: {start: 4, end: 0},
                alpha: {start: 0.6, end: 0},
                lifespan: 1000,
                tint: [0x00ff00, 0x00bf00],
                emitting: false
            });
            emitter.setDepth(99999);
            emitter.explode(20);
            this.time.delayedCall(1000, () => emitter.destroy());
            this.time.delayedCall(300, callback);
        });
    }

    // --- Helper: Refactored Move Logic ---
    executeEnemyMove(enemy, targetX, targetY, callback) {
        this.easystar.findPath(enemy.gridPos.x, enemy.gridPos.y, targetX, targetY, (path) => {
            if (path && path.length > 1) {
                const truncatedPath = path.slice(0, Math.min(path.length, enemy.stats.moveRange + 1));
                this.moveCharacterAlongPath(enemy, truncatedPath, callback);
            } else {
                // No path found (or start == end)
                if (callback) callback();
            }
        });
        this.easystar.calculate();
    }

    // --- Helper: Refactored Attack Logic ---
    performEnemyAttack(enemy, target, attackMove, callback) {
        // Face the target
        const dx = target.gridPos.x - enemy.gridPos.x;
        // Simple flip logic (assuming right-facing sprite)
        if (dx !== 0) { // a flip is not needed if the target is on the same column
            enemy.sprite.flipX = dx < 0;
        }


        const onHit = () => {
            if (dx !== 0) {
               enemy.sprite.flipX = false; // Reset orientation
            }
            const damageInfo = enemy.calculateDamage(target, attackMove);
            target.takeDamage(damageInfo, enemy, attackMove);
             if(attackMove.status){
                target.addStatusEffect(attackMove.status);
            }
            this.time.delayedCall(300, callback);
        };

        if (attackMove.type === 'arrow_attack' || attackMove.type === 'fireball' || attackMove.type === 'freeze_ball') {
             enemy.attack(target, () => {
                const projectileKey = attackMove.type.replace('_attack', '_projectile').replace('_ball', '_ball_projectile');
                const projectile = new Projectile(
                    this,
                    enemy.sprite.x,
                    enemy.sprite.y - 24,
                    ASSETS.image[projectileKey].key,
                    target.sprite,
                    onHit
                );
                projectile.setDepth(9999);
            });
        }
        else {
             enemy.attack(target, onHit);
        }
    }

    onUnitDied(unit) {
        this.easystar.stopAvoidingAdditionalPoint(unit.gridPos.x, unit.gridPos.y);

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
        } else {
            // It's an enemy unit
            const enemyUnitsLeft = this.units.filter(u => !u.isPlayer && u !== unit);
            if (enemyUnitsLeft.length === 0) {
                // VICTORY!
                this.scene.stop('ActionUI');
                this.scene.stop('TimelineUI');
                
                const newLevel = this.level + 1;
                this.registry.set('level', newLevel);
                this.registry.set('shopRefreshes', 1); // Grant 1 refresh

                if (newLevel > 10) {
                    // TODO: Implement a proper "You Win The Game" scene
                    this.scene.start('MainMenu');
                } else {
                    this.scene.start('SquadUpgrade');
                }
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

        unit.sprite.on('pointerdown', (pointer) => {
            if (this.isMoving) return;

            if (pointer.rightButtonDown()) {
                pointer.event.stopPropagation();
                this.events.emit('unit_right_clicked', unit);
                return;
            }

            if (this.gameState !== 'PLAYER_TURN') return;
            pointer.event.stopPropagation();

            if (this.playerActionState === 'SELECTING_ACTION' && unit.isPlayer) {
                this.activatePlayerUnit(unit);
            }
        });

        // --- UPDATED: Hover Logic to coordinate with Idle ---
        unit.sprite.on('pointerover', () => {
            if (unit.isPlayer && this.activePlayerUnit !== unit) {
                // 1. Stop the Idle breathing
                unit.stopIdle();

                // 2. Kill any other tweens (safety)
                this.tweens.killTweensOf(unit.sprite);

                // 3. Start the "Hover Lift" (move up 3px)
                this.tweens.add({
                    targets: unit.sprite,
                    y: unit.sprite.getData('originalY') - 3,
                    duration: 50,
                    ease: 'Sine.easeInOut',
                    yoyo: false,
                });
            }
        });

        unit.sprite.on('pointerout', () => {
            if (unit.isPlayer && this.activePlayerUnit !== unit) {
                // 1. Kill the "Hover Lift" tween
                this.tweens.killTweensOf(unit.sprite);

                // 2. Reset Y to floor
                unit.sprite.setY(unit.sprite.getData('originalY'));

                // 3. Resume Idle breathing
                unit.startIdle();
            }
        });
    }
}