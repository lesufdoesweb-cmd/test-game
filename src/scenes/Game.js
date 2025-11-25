import ASSETS from '../assets.js';
import {Chest} from '../gameObjects/Chest.js';
import {NPC} from '../gameObjects/NPC.js';
import {testMap} from "../battle_maps/test_map.js";
import {testArmy} from "../enemy_armies/test_army.js";
import {defaultArmy} from "../player_armies/default_army.js";
import {Scenery} from "../gameObjects/Scenery.js";
import {MapManager} from "../systems/MapManager.js";
import {UnitManager} from "../systems/UnitManager.js";
import {TurnManager} from "../systems/TurnManager.js";
import {ActionManager} from "../systems/ActionManager.js";
import {InputManager} from "../systems/InputManager.js";
import {AnimationManager} from "../systems/AnimationManager.js";
import {AIManager} from "../systems/AIManager.js";

export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
        this.mapManager = new MapManager(this);
        this.unitManager = new UnitManager(this);
        this.turnManager = new TurnManager(this);
        this.actionManager = new ActionManager(this);
        this.inputManager = new InputManager(this);
        this.animationManager = new AnimationManager(this);
        this.aiManager = new AIManager(this);
        this.activePlayerUnit = null;
        this.sceneryObjects = [];
        this.rangeHighlights = [];
        this.validActionTiles = [];
        this.hoverIndicator = null;
        this.selectedUnitIndicator = null;

        this.playerActionState = null; // e.g., 'SELECTING_ACTION', 'MOVING', 'ATTACKING'
        this.vignette = null;
        this.activeUnitTween = null;
        this.isMoving = false; // ensure defined

        // --- RESTORED: Animation Arrays ---
        this.animTiles = [];
        this.animObjects = [];
    }

    create(data) {
        // Clear previous animation arrays
        this.animTiles = [];
        this.animObjects = [];

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

        const origin = {
            x: this.scale.width / 2,
            y: this.scale.height / 2 - 100
        };

        const levelData = this.mapManager.initialize(levelConfig, origin);

        // Add the combat background image
        const { width, height } = this.scale;
        const bgImage = this.add.image(width / 2, height / 2, 'bg_fights');

        const scaleX = width / bgImage.width;
        const scaleY = height / bgImage.height;
        const scale = Math.max(scaleX, scaleY);
        bgImage.setScale(scale).setDepth(-1).setScrollFactor(0);

        // --- Generate Particle Texture ONCE to avoid feedback loops ---
        if (!this.textures.exists('particle')) {
            const particleG = this.make.graphics({ x: 0, y: 0, add: false });
            particleG.fillStyle(0xffffff);
            particleG.fillRect(0, 0, 1, 1);
            particleG.generateTexture('particle', 1, 1);
        }

        this.mapManager.renderMap(levelData);

        // --- Object Creation from Config ---
        levelData.objects.forEach(obj => {
            const screenX = this.mapManager.origin.x + (obj.position.x - obj.position.y) * this.mapManager.mapConsts.HALF_WIDTH;
            const screenY = this.mapManager.origin.y + (obj.position.x + obj.position.y) * this.mapManager.mapConsts.QUARTER_HEIGHT;

            let createdObject = null;

            switch (obj.type) {
                case 'unit':
                    this.unitManager.createUnit(obj);
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
            }
        });


        // Orc animations removed as per request for programmatic animation
        this.unitManager.units.forEach(u => {
            if (!u.isPlayer) {
                // Future programmatic idle animation can go here
            }
        });

        // --- Camera and Input ---
        this.cameras.main.setZoom(2);
        this.cameras.main.setRoundPixels(true);

        const mapWidthInTiles = this.mapManager.mapConsts.MAP_SIZE_X;
        const mapHeightInTiles = this.mapManager.mapConsts.MAP_SIZE_Y;
        const tileHalfWidth = this.mapManager.mapConsts.HALF_WIDTH;
        const tileQuarterHeight = this.mapManager.mapConsts.QUARTER_HEIGHT;

        // Calculate the world coordinates of the map's bounding box
        const worldMinX = this.mapManager.origin.x - (mapHeightInTiles) * tileHalfWidth;
        const worldMaxX = this.mapManager.origin.x + (mapWidthInTiles) * tileHalfWidth;
        const worldMinY = this.mapManager.origin.y - 100; //- (mapHeightInTiles) * tileQuarterHeight;
        const worldMaxY = this.mapManager.origin.y + (mapWidthInTiles + mapHeightInTiles) * tileQuarterHeight;

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
        const midGridX = (this.mapManager.mapConsts.MAP_SIZE_X - 1) / 2;
        const midGridY = (this.mapManager.mapConsts.MAP_SIZE_Y - 1) / 2;
        const mapCenterX = this.mapManager.origin.x + (midGridX - midGridY) * this.mapManager.mapConsts.HALF_WIDTH;
        const mapCenterY = this.mapManager.origin.y + (midGridX + midGridY) * this.mapManager.mapConsts.QUARTER_HEIGHT;
        this.cameras.main.centerOn(mapCenterX, mapCenterY);


        // --- Start Game ---
        this.turnManager.buildTurnOrder(this.unitManager.units);
        this.scene.launch('TimelineUI', {turnOrder: this.turnManager.turnOrder});
        this.scene.launch('ActionUI');
        this.scene.launch('PlayerStatsUI');

        // --- Event Listeners ---
        this.events.on('unit_stats_changed', (unit) => {
            if (this.unitManager.playerUnits.includes(unit)) {
                this.events.emit('player_stats_changed', unit);
            }
        });
        this.events.on('action_selected', this.actionManager.onActionSelected, this.actionManager);
        this.events.on('unit_died', this.onUnitDied, this);
        this.events.on('action_cancelled', this.cancelPlayerAction, this);
        this.events.on('skip_turn', this.endFullPlayerTurn, this);

        this.inputManager.initialize();
        this.events.on('unit_damaged', this.animationManager.createDamageEffect, this.animationManager);

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

        this.cameras.main.postFX.addVignette(0.5, 0.5, 0.98, 0.4);

        this.animationManager.animateSceneEntry();
    }

    update(time, delta) {
        this.unitManager.units.forEach(u => u.update());
        if (this.vignette && this.activePlayerUnit) {
            this.vignette.x = this.activePlayerUnit.sprite.x;
            this.vignette.y = this.activePlayerUnit.sprite.y;
        }

        // --- Scenery Transparency Logic ---
        this.sceneryObjects.forEach(scenery => {
            scenery.sprite.alpha = 1;
        });

        this.unitManager.units.forEach(unit => {
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
            const gridPos = this.mapManager.screenToGrid(worldPoint.x, worldPoint.y);

            const isTileValid = this.validActionTiles.some(tile => tile.x === gridPos.x && tile.y === gridPos.y);

            if (isTileValid) {
                let color = 0xffffff; // Default for move
                if (actionState === 'attack' || actionState === 'arrow_attack') color = 0xff0000;
                if (actionState === 'enhance_armor') color = 0x00ff99;

                const screenX = this.mapManager.origin.x + (gridPos.x - gridPos.y) * this.mapManager.mapConsts.HALF_WIDTH + 2;
                const screenY = this.mapManager.origin.y + (gridPos.x + gridPos.y) * this.mapManager.mapConsts.QUARTER_HEIGHT - 6;

                // Use the animated value to offset the Y position
                const animatedY = screenY + this.hoverAnimY;

                this.hoverIndicator = this.createCornerIsometricIndicator(screenX, animatedY, color, 1);
                this.hoverIndicator.setDepth(9999); // Set a high depth to ensure it's on top
            }
        }
    }

    createIsometricIndicator(screenX, screenY, color = 0x0000ff, alpha = 0.5) {
        const graphics = this.add.graphics();
        graphics.fillStyle(color, alpha);
        const size = this.mapManager.mapConsts.TILE_WIDTH * 1;
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
        const width = this.mapManager.mapConsts.TILE_WIDTH + (padding * 2);
        const height = (this.mapManager.mapConsts.TILE_WIDTH * 0.5) + (padding); // Maintain aspect ratio

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

    moveCharacterAlongPath(unit, path, onCompleteCallback) {
        if (!path || path.length <= 1) {
            if (onCompleteCallback) onCompleteCallback();
            return;
        }

        this.isMoving = true;
        this.events.emit('unit_is_moving');

        if (unit.isPlayer) {
            this.events.emit('player_action_selected');
        }

        // Store initial x position for flip comparison
        unit.sprite.setData('prevX', unit.sprite.x);

        // 1. Setup the Linear Ground Path
        const screenPath = path.map(pos => ({
            x: this.mapManager.origin.x + (pos.x - pos.y) * this.mapManager.mapConsts.HALF_WIDTH,
            y: this.mapManager.origin.y + (pos.x + pos.y) * this.mapManager.mapConsts.QUARTER_HEIGHT,
        }));

        const movementPath = new Phaser.Curves.Path(screenPath[0].x, screenPath[0].y);
        for (let i = 1; i < screenPath.length; i++) {
            movementPath.lineTo(screenPath[i].x, screenPath[i].y);
        }

        const duration = 200 * (path.length - 1);
        const follower = { t: 0, vec: new Phaser.Math.Vector2() };

        const hopHeight = 8; // Slight increase for better visual
        const totalSteps = path.length - 1;

        this.tweens.add({
            targets: follower,
            t: 1,
            duration: duration,
            ease: 'Linear',
            onUpdate: () => {
                // Get the ground position
                movementPath.getPoint(follower.t, follower.vec);

                // Calculate Hop
                const hopY = Math.sin(follower.t * totalSteps * Math.PI) * hopHeight;

                // 1. Move the UNIT (Apply Hop)
                unit.sprite.setPosition(follower.vec.x, follower.vec.y - Math.abs(hopY));

                // 2. Move the SHADOW (Stay on Ground)
                if (unit.shadow) {
                    unit.shadow.setPosition(follower.vec.x, follower.vec.y);
                    // Shrink shadow slightly when high in the air
                    const scaleMod = 1 - (Math.abs(hopY) / 40);
                    unit.shadow.setScale(scaleMod, -0.5 * scaleMod);
                }

                // Flip logic
                if (unit.sprite.x < unit.sprite.getData('prevX')) {
                    unit.sprite.flipX = true;
                    if (unit.shadow) unit.shadow.flipX = true;
                } else if (unit.sprite.x > unit.sprite.getData('prevX')) {
                    unit.sprite.flipX = false;
                    if (unit.shadow) unit.shadow.flipX = false;
                }
                unit.sprite.setData('prevX', unit.sprite.x);

                // Update depth based on GROUND Y
                unit.sprite.setDepth(follower.vec.y);
                if (unit.shadow) unit.shadow.setDepth(follower.vec.y - 0.1);
            },
            onComplete: () => {
                const lastPos = path[path.length - 1];
                unit.gridPos.x = lastPos.x;
                unit.gridPos.y = lastPos.y;
                this.isMoving = false;

                unit.sprite.setData('prevX', undefined);

                if (this.activeUnitTween && this.activePlayerUnit === unit) {
                    this.activeUnitTween.stop();
                }

                const newOriginalY = this.mapManager.origin.y + (lastPos.x + lastPos.y) * this.mapManager.mapConsts.QUARTER_HEIGHT;

                // Ensure they land exactly on the ground
                unit.sprite.setPosition(screenPath[screenPath.length-1].x, newOriginalY);
                unit.sprite.setData('originalY', newOriginalY);

                // Snap shadow to final position
                if (unit.shadow) {
                    unit.shadow.setPosition(screenPath[screenPath.length-1].x, newOriginalY);
                    unit.shadow.setScale(1, -0.5); // Reset scale
                }

                // Update the selected unit indicator
                if (this.selectedUnitIndicator && this.activePlayerUnit === unit) {
                    this.selectedUnitIndicator.destroy();
                    const screenX = this.mapManager.origin.x + (lastPos.x - lastPos.y) * this.mapManager.mapConsts.HALF_WIDTH;
                    const screenY = this.mapManager.origin.y + (lastPos.x + lastPos.y) * this.mapManager.mapConsts.QUARTER_HEIGHT;
                    this.selectedUnitIndicator = this.createCornerIsometricIndicator(screenX, screenY - 7, 0x0000ff);
                    this.selectedUnitIndicator.setDepth(unit.sprite.depth - 0.25);

                    this.tweens.add({
                        targets: this.selectedUnitIndicator,
                        y: this.selectedUnitIndicator.y - 3,
                        duration: 500,
                        ease: 'Sine.easeInOut',
                        yoyo: true,
                        repeat: -1,
                        repeatDelay: 0
                    });
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

    deactivateCurrentPlayerUnitSelection() {
        if (this.activePlayerUnit && this.activePlayerUnit.sprite) {
            this.tweens.killTweensOf(this.activePlayerUnit.sprite);
            this.activePlayerUnit.sprite.setY(this.activePlayerUnit.sprite.getData('originalY'));
        }
        if (this.selectedUnitIndicator) {
            this.tweens.killTweensOf(this.selectedUnitIndicator); // Kill indicator tweens
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
        const screenX = this.mapManager.origin.x + (unit.gridPos.x - unit.gridPos.y) * this.mapManager.mapConsts.HALF_WIDTH;
        const screenY = this.mapManager.origin.y + (unit.gridPos.x + unit.gridPos.y) * this.mapManager.mapConsts.QUARTER_HEIGHT;
        this.selectedUnitIndicator = this.createCornerIsometricIndicator(screenX, screenY - 7, 0x0000ff); // Blue color
        this.selectedUnitIndicator.setDepth(unit.sprite.depth - 0.25); // Ensure it's *below* the unit, but above the tile

        // --- Add bobbing tween to selected unit indicator ---
        this.tweens.add({
            targets: this.selectedUnitIndicator,
            y: this.selectedUnitIndicator.y - 3, // Move up by 3 pixels
            duration: 500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
            repeatDelay: 0
        });
    }

    startPlayerUnitTurn(unit) {
        this.gameState = 'PLAYER_TURN';
        this.playerActionState = 'SELECTING_ACTION';

        // This is the start of the player phase. Reset all player units.
        this.unitManager.playerUnits.forEach(pUnit => {
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
        let nextIndex = (this.turnManager.turnIndex + 1) % this.turnManager.turnOrder.length;
        let looped = false;
        while (nextIndex !== this.turnManager.turnIndex || !looped) {
            if(nextIndex === this.turnManager.turnIndex) looped = true;
            if (!this.turnManager.turnOrder[nextIndex].isPlayer) {
                this.turnManager.turnIndex = nextIndex;
                this.turnManager.startNextTurn();
                return;
            }
            nextIndex = (nextIndex + 1) % this.turnManager.turnOrder.length;
        }

        // If no enemy was found in a full loop, it means there are no enemies.
        // We should start the next round with the first unit.
        this.turnManager.turnIndex = 0;
        this.turnManager.startNextTurn();
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
        const startScreenX = this.mapManager.origin.x + (startPos.x - startPos.y) * this.mapManager.mapConsts.HALF_WIDTH + 2;
        const startScreenY = this.mapManager.origin.y + (startPos.x + startPos.y) * this.mapManager.mapConsts.QUARTER_HEIGHT - 6;
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
            this.unitManager.units.forEach(unit => {
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

                if (neighbor.x >= 0 && neighbor.x < this.mapManager.mapConsts.MAP_SIZE_X &&
                    neighbor.y >= 0 && neighbor.y < this.mapManager.mapConsts.MAP_SIZE_Y &&
                    this.mapManager.walkableTiles.includes(this.mapManager.grid[neighbor.y][neighbor.x])) {

                    closedList.add(posKey);
                    openList.push({pos: neighbor, cost: current.cost + 1});
                    this.validActionTiles.push(neighbor); // Store the valid tile

                    const screenX = this.mapManager.origin.x + (neighbor.x - neighbor.y) * this.mapManager.mapConsts.HALF_WIDTH + 2;
                    const screenY = this.mapManager.origin.y + (neighbor.x + neighbor.y) * this.mapManager.mapConsts.QUARTER_HEIGHT - 6;
                    const indicator = this.createIsometricIndicator(screenX, screenY, color, 0.2);
                    indicator.disableInteractive();
                    indicator.setDepth(neighbor.x + neighbor.y + 0.5);
                    this.rangeHighlights.push(indicator);
                }
            }
        }
    }

    highlightFriendlyTargets(range) {
        for (const unit of this.unitManager.playerUnits) {
            // A unit can cast on itself
            const distance = Math.abs(this.activePlayerUnit.gridPos.x - unit.gridPos.x) + Math.abs(this.activePlayerUnit.gridPos.y - unit.gridPos.y);
            if (distance <= range) {
                unit.sprite.setTint(0x00ff00); // Green tint for valid targets
            }
        }
    }

    highlightAttackableEnemies(range) {
        const enemies = this.unitManager.units.filter(u => !u.isPlayer);
        for (const enemy of enemies) {
            const distance = Math.abs(this.activePlayerUnit.gridPos.x - enemy.gridPos.x) + Math.abs(this.activePlayerUnit.gridPos.y - enemy.gridPos.y);
            if (distance <= range) {
                enemy.sprite.setTint(0xff0000);
            }
        }
    }

    clearHighlights() {
        this.unitManager.units.forEach(u => u.sprite.clearTint());
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

    startEnemyTurn(enemy) {
        this.gameState = 'ENEMY_TURN';
        this.aiManager.takeEnemyTurn(enemy, () => {
            this.turnManager.endTurn()
        });
    }

    onUnitDied(unit) {
        this.turnManager.removeUnit(unit);

        if (unit.isPlayer) {
            const playerUnitIndex = this.unitManager.playerUnits.indexOf(unit);
            if (playerUnitIndex > -1) {
                this.unitManager.playerUnits.splice(playerUnitIndex, 1);
            }

            if (this.unitManager.playerUnits.length === 0) {
                this.scene.stop('ActionUI');
                this.scene.stop('TimelineUI');
                this.scene.start('GameOver');
                return;
            }
        }

        const unitIndex = this.unitManager.units.indexOf(unit);
        if (unitIndex > -1) {
            this.unitManager.units.splice(unitIndex, 1);
        }

        this.events.emit('turn_changed', this.turnManager.turnIndex);
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
                    y: unit.sprite.getData('originalY') - 3, // Float up slightly
                    duration: 50,
                    ease: 'Sine.easeInOut',
                    yoyo: false,
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
    }
}
