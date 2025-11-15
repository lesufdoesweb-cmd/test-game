    import ASSETS from '../assets.js';

    export class Game extends Phaser.Scene {
        constructor() {
            super('Game');
            this.easystar = null;
            this.player = null;
            this.playerGridPos = { x: 0, y: 0 };
            this.origin = { x: 0, y: 0 };
            this.mapConsts = {
                MAP_SIZE: 9,
                TILE_WIDTH: 31,
                HALF_WIDTH: 0,
                QUARTER_HEIGHT: 0,
            }
            this.pathIndicators = [];
            this.lastHoverTile = { x: -1, y: -1 };
        }

        create() {
            this.mapConsts.HALF_WIDTH = this.mapConsts.TILE_WIDTH / 2;
            this.mapConsts.QUARTER_HEIGHT = this.mapConsts.TILE_WIDTH / 4;

            this.origin.x = this.scale.width / 2;
            this.origin.y = this.scale.height / 2 - 100;

            // --- Grid and Pathfinding Setup ---
            this.easystar = new EasyStar.js();
            const grid = [];
            for (let y = 0; y < this.mapConsts.MAP_SIZE; y++) {
                grid.push(new Array(this.mapConsts.MAP_SIZE).fill(0));
            }
            this.playerGridPos = { x: 4, y: 4 };

            // Place some rocks randomly, avoiding player start position
            const numberOfRocks = 15;
            for (let i = 0; i < numberOfRocks; i++) {
                let rockX, rockY;
                do {
                    rockX = Math.floor(Math.random() * this.mapConsts.MAP_SIZE);
                    rockY = Math.floor(Math.random() * this.mapConsts.MAP_SIZE);
                } while (
                    (rockX === this.playerGridPos.x && rockY === this.playerGridPos.y) ||
                    grid[rockY][rockX] === 1 // Already a rock here
                    );
                grid[rockY][rockX] = 1; // 1 = unwalkable
            }

            this.easystar.setGrid(grid);
            this.easystar.setAcceptableTiles([0]);

            // --- Map Rendering ---
            for (let gridY = 0; gridY < this.mapConsts.MAP_SIZE; gridY++) {
                for (let gridX = 0; gridX < this.mapConsts.MAP_SIZE; gridX++) {
                    const screenX = this.origin.x + (gridX - gridY) * this.mapConsts.HALF_WIDTH;
                    const screenY = this.origin.y + (gridX + gridY) * this.mapConsts.QUARTER_HEIGHT;

                    const tile = this.add.image(screenX, screenY, ASSETS.image.forest_tiles.key);
                    tile.setDepth(gridX + gridY);

                    if (grid[gridY][gridX] === 1) {
                        const rock = this.add.image(screenX, screenY - 8, ASSETS.image.rock_tile.key);
                        rock.setDepth(gridX + gridY);
                    }

                    // Add interactive area for hover
                    const interactiveZone = this.add.zone(screenX + 8, screenY, this.mapConsts.TILE_WIDTH, this.mapConsts.TILE_WIDTH / 2);
                    interactiveZone.setData('gridX', gridX);
                    interactiveZone.setData('gridY', gridY);
                    const hitArea = new Phaser.Geom.Polygon([
                        0, -this.mapConsts.QUARTER_HEIGHT,
                        this.mapConsts.HALF_WIDTH, 0,
                        0, this.mapConsts.QUARTER_HEIGHT,
                        -this.mapConsts.HALF_WIDTH, 0
                    ]);
                    interactiveZone.setInteractive(hitArea, Phaser.Geom.Polygon.Contains);
                }
            }

            // --- Player Character ---
            const playerScreenX = this.origin.x + (this.playerGridPos.x - this.playerGridPos.y) * this.mapConsts.HALF_WIDTH;
            const playerScreenY = this.origin.y + (this.playerGridPos.x + this.playerGridPos.y) * this.mapConsts.QUARTER_HEIGHT - 16;

            this.player = this.add.sprite(playerScreenX, playerScreenY, ASSETS.spritesheet.basic_unit.key);
            this.player.setDepth(9999999);

            // --- Animations ---
            this.anims.create({
                key: 'walk_down',
                frames: this.anims.generateFrameNumbers(ASSETS.spritesheet.basic_unit.key, { start: 0, end: 3 }),
                frameRate: 8,
                repeat: -1
            });
            this.player.play('walk_down');

            // --- Camera and Input ---
            this.cameras.main.setZoom(2.5);
            this.cameras.main.centerOn(this.origin.x, this.origin.y + this.mapConsts.MAP_SIZE * this.mapConsts.QUARTER_HEIGHT);

            // --- Hover Path Visualization ---
            this.input.on('pointerover', (pointer, gameObjects) => {
                if (gameObjects.length > 0 && !this.isMoving) {
                    const hoveredZone = gameObjects[0];
                    const gridX = hoveredZone.getData('gridX');
                    const gridY = hoveredZone.getData('gridY');

                    if (gridX !== this.lastHoverTile.x || gridY !== this.lastHoverTile.y) {
                        this.lastHoverTile = { x: gridX, y: gridY };
                        this.showPathPreview(gridX, gridY);
                    }
                }
            });

            this.input.on('pointerout', () => {
                this.clearPathPreview();
                this.lastHoverTile = { x: -1, y: -1 };
            });

            this.input.on('pointerdown', (pointer, gameObjects) => {
                if (!pointer.leftButtonDown() || this.isMoving) {
                    return;
                }

                if (gameObjects.length > 0) {
                    // Find the first game object that is a tile zone
                    const clickedZone = gameObjects.find(go => go.getData('gridX') !== undefined);
                    if (clickedZone) {
                        const gridX = clickedZone.getData('gridX');
                        const gridY = clickedZone.getData('gridY');
                        this.movePlayer(gridX, gridY);
                    }
                }
            });

            this.input.on('pointermove', (pointer) => {
                if (pointer.middleButtonDown()) {
                    const cam = this.cameras.main;
                    cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
                    cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
                }
            });
        }

        createIsometricIndicator(screenX, screenY, color = 0x0000ff, alpha = 0.5) {
            // Create a diamond shape that matches the isometric cube face
            const graphics = this.add.graphics();
            graphics.fillStyle(color, alpha);
            screenY = screenY - 8;
            // Draw a diamond shape (rotated square)
            const size = this.mapConsts.TILE_WIDTH * 1; // Slightly smaller than the tile

            // Diamond points (rotated 45 degrees)
            graphics.beginPath();
            graphics.moveTo(screenX, screenY - size/4); // Top
            graphics.lineTo(screenX + size/2, screenY); // Right
            graphics.lineTo(screenX, screenY + size/4); // Bottom
            graphics.lineTo(screenX - size/2, screenY); // Left
            graphics.closePath();
            graphics.fillPath();

            return graphics;
        }

        showPathPreview(targetX, targetY) {
            this.clearPathPreview();

            this.easystar.findPath(this.playerGridPos.x, this.playerGridPos.y, targetX, targetY, (path) => {
                if (path && path.length > 0) {
                    // Create isometric indicators for each tile in the path
                    path.forEach((tilePos, index) => {
                        const screenX = this.origin.x + (tilePos.x - tilePos.y) * this.mapConsts.HALF_WIDTH;
                        const screenY = this.origin.y + (tilePos.x + tilePos.y) * this.mapConsts.QUARTER_HEIGHT;

                        // Use different colors for start, path, and destination
                        let color = 0x0000ff; // Blue for path
                        if (index === 0) color = 0x00ff00; // Green for start
                        if (index === path.length - 1) color = 0xff0000; // Red for destination

                        const indicator = this.createIsometricIndicator(screenX, screenY, color, 0.7);

                        // Set proper depth
                        indicator.setDepth(tilePos.x + tilePos.y + 0.5);
                        this.pathIndicators.push(indicator);

                        // Add step number
                        const stepText = this.add.text(
                            screenX,
                            screenY,
                            index.toString(),
                            {
                                fontSize: '10px',
                                color: '#ffffff',
                                stroke: '#000000',
                                strokeThickness: 2
                            }
                        );
                        stepText.setOrigin(0.5);
                        stepText.setDepth(tilePos.x + tilePos.y + 0.6);
                        this.pathIndicators.push(stepText);
                    });
                }
            });
            this.easystar.calculate();
        }

        clearPathPreview() {
            this.pathIndicators.forEach(indicator => {
                indicator.destroy();
            });
            this.pathIndicators = [];
        }

        movePlayer(targetX, targetY) {
            this.clearPathPreview();
            this.lastHoverTile = { x: -1, y: -1 };

            this.easystar.findPath(this.playerGridPos.x, this.playerGridPos.y, targetX, targetY, (path) => {
                if (path === null) {
                    console.log("Path was not found.");
                } else {
                    this.moveCharacterAlongPath(path);
                }
            });
            this.easystar.calculate();
        }

        moveCharacterAlongPath(path) {
            if (path.length === 0) {
                return;
            }

            this.isMoving = true;
            const tweens = [];

            for(let i = 1; i < path.length; i++) {
                const nextPos = path[i];
                const screenX = this.origin.x + (nextPos.x - nextPos.y) * this.mapConsts.HALF_WIDTH;
                const screenY = this.origin.y + (nextPos.x + nextPos.y) * this.mapConsts.QUARTER_HEIGHT;

                tweens.push({
                    targets: this.player,
                    x: screenX,
                    y: screenY - 16,
                    duration: 200,
                    onStart: () => {
                        if (i === 1) {
                            this.playerGridPos.x = nextPos.x;
                            this.playerGridPos.y = nextPos.y;
                        }
                    },
                    onComplete: () => {
                        this.playerGridPos.x = nextPos.x;
                        this.playerGridPos.y = nextPos.y;
                        this.player.setDepth(9999999);

                        // Mark movement as complete on the last tween
                        if (i === path.length - 1) {
                            this.isMoving = false;
                        }
                    }
                });
            }

            if (tweens.length > 0) {
                this.tweens.chain({
                    tweens: tweens,
                    onComplete: () => {
                        this.isMoving = false;
                    }
                });
            } else {
                this.isMoving = false;
            }
        }
    }