    import ASSETS from '../assets.js';

    export class Game extends Phaser.Scene {
        constructor() {
            super('Game');
            this.easystar = null;
            this.player = null;
            this.playerGridPos = { x: 0, y: 0 };
            this.grid = [];
            this.origin = { x: 0, y: 0 };
            this.mapConsts = {
                MAP_SIZE: 9,
                TILE_WIDTH: 31,
                HALF_WIDTH: 0,
                QUARTER_HEIGHT: 0,
            }
            this.pathIndicators = [];
            this.lastHoverTile = { x: -1, y: -1 };

            this.playerMoveLimit = 4;
            this.gameState = 'PLAYER_TURN';
            this.enemies = [];
            this.enemyTurnIndex = 0;
        }

        create() {
            this.mapConsts.HALF_WIDTH = this.mapConsts.TILE_WIDTH / 2;
            this.mapConsts.QUARTER_HEIGHT = this.mapConsts.TILE_WIDTH / 4;

            this.origin.x = this.scale.width / 2;
            this.origin.y = this.scale.height / 2 - 100;

            // --- Grid and Pathfinding Setup ---
            this.easystar = new EasyStar.js();
            for (let y = 0; y < this.mapConsts.MAP_SIZE; y++) {
                this.grid.push(new Array(this.mapConsts.MAP_SIZE).fill(0));
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
                    this.grid[rockY][rockX] === 1 // Already a rock here
                    );
                this.grid[rockY][rockX] = 1; // 1 = unwalkable
            }

            this.easystar.setGrid(this.grid);
            this.easystar.setAcceptableTiles([0]);

            // --- Map Rendering ---
            for (let gridY = 0; gridY < this.mapConsts.MAP_SIZE; gridY++) {
                for (let gridX = 0; gridX < this.mapConsts.MAP_SIZE; gridX++) {
                    const screenX = this.origin.x + (gridX - gridY) * this.mapConsts.HALF_WIDTH;
                    const screenY = this.origin.y + (gridX + gridY) * this.mapConsts.QUARTER_HEIGHT;

                    const tile = this.add.image(screenX, screenY, ASSETS.image.forest_tiles.key);
                    tile.setDepth(gridX + gridY);

                    if (this.grid[gridY][gridX] === 1) {
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

            // --- Orc Character ---
            let orcX, orcY;
            do {
                orcX = Math.floor(Math.random() * this.mapConsts.MAP_SIZE);
                orcY = Math.floor(Math.random() * this.mapConsts.MAP_SIZE);
            } while (
                (orcX === this.playerGridPos.x && orcY === this.playerGridPos.y) ||
                this.grid[orcY][orcX] === 1
                );
            const orcGridPos = { x: orcX, y: orcY };
            const orcScreenX = this.origin.x + (orcGridPos.x - orcGridPos.y) * this.mapConsts.HALF_WIDTH;
            const orcScreenY = this.origin.y + (orcGridPos.x + orcGridPos.y) * this.mapConsts.QUARTER_HEIGHT - 16;
            const orcSprite = this.add.sprite(orcScreenX, orcScreenY, ASSETS.spritesheet.basic_unit.key);
            orcSprite.setDepth(9999998);

            const orc = {
                sprite: orcSprite,
                gridPos: orcGridPos,
                moveLimit: 3
            };
            this.enemies.push(orc);


            // --- Animations ---
            this.anims.create({
                key: 'knight_idle',
                frames: this.anims.generateFrameNumbers(ASSETS.spritesheet.basic_unit.key, { start: 0, end: 4 }),
                frameRate: 8,
                repeat: -1
            });
            this.anims.create({
                key: 'knight_walk',
                frames: this.anims.generateFrameNumbers(ASSETS.spritesheet.basic_unit.key, { start: 5, end: 14 }),
                frameRate: 8,
                repeat: -1
            });
            this.player.play('knight_idle');

            // Orc animations
            this.anims.create({
                key: 'orc_idle',
                frames: this.anims.generateFrameNumbers(ASSETS.spritesheet.basic_unit.key, { start: 26, end: 29 }),
                frameRate: 6,
                repeat: -1
            });
            this.anims.create({
                key: 'orc_walk',
                frames: this.anims.generateFrameNumbers(ASSETS.spritesheet.basic_unit.key, { start: 30, end: 37 }),
                frameRate: 8,
                repeat: -1
            });
            this.anims.create({
                key: 'orc_attack',
                frames: this.anims.generateFrameNumbers(ASSETS.spritesheet.basic_unit.key, { start: 38, end: 40 }),
                frameRate: 8,
                repeat: 0
            });

            this.enemies[0].sprite.play('orc_idle');

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
                        if (index === 0) return; // Don't show indicator for start tile
                        const screenX = this.origin.x + (tilePos.x - tilePos.y) * this.mapConsts.HALF_WIDTH;
                        const screenY = this.origin.y + (tilePos.x + tilePos.y) * this.mapConsts.QUARTER_HEIGHT;

                        const isAllowed = index <= this.playerMoveLimit;
                        const color = isAllowed ? 0x0000ff : 0xff0000; // Blue for allowed, red for not
                        const alpha = isAllowed ? 0.7 : 0.4;

                        const indicator = this.createIsometricIndicator(screenX, screenY, color, alpha);

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
            if (this.gameState !== 'PLAYER_TURN' || this.isMoving) {
                return;
            }
            this.clearPathPreview();
            this.lastHoverTile = { x: -1, y: -1 };

            this.easystar.findPath(this.playerGridPos.x, this.playerGridPos.y, targetX, targetY, (path) => {
                if (path && path.length > 1) {
                    const truncatedPath = path.slice(0, Math.min(path.length, this.playerMoveLimit + 1));
                    this.moveCharacterAlongPath(truncatedPath);
                } else {
                    console.log("Path was not found or is too short.");
                }
            });
            this.easystar.calculate();
        }

        moveCharacterAlongPath(path) {
            if (!path || path.length <= 1) {
                this.isMoving = false;
                if (this.player.anims.currentAnim.key !== 'knight_idle') {
                    this.player.play('knight_idle');
                }
                return;
            }

            this.isMoving = true;
            this.player.play('knight_walk');
            const tweens = [];

            for (let i = 1; i < path.length; i++) {
                const prevPos = path[i - 1];
                const nextPos = path[i];

                const dx = nextPos.x - prevPos.x;
                const dy = nextPos.y - prevPos.y;

                const screenX = this.origin.x + (nextPos.x - nextPos.y) * this.mapConsts.HALF_WIDTH;
                const screenY = this.origin.y + (nextPos.x + nextPos.y) * this.mapConsts.QUARTER_HEIGHT;

                tweens.push({
                    targets: this.player,
                    x: screenX,
                    y: screenY - 16,
                    duration: 200,
                    onStart: () => {
                        // West or South movement is "left-ish" on screen
                        if (dx === -1 || dy === 1) {
                            this.player.flipX = true;
                        } else if (dx === 1 || dy === -1) { // East or North is "right-ish"
                            this.player.flipX = false;
                        }
                    },
                    onComplete: () => {
                        this.playerGridPos.x = nextPos.x;
                        this.playerGridPos.y = nextPos.y;
                        this.player.setDepth(9999999);
                    }
                });
            }

            this.tweens.chain({
                tweens: tweens,
                onComplete: () => {
                    this.isMoving = false;
                    this.player.play('knight_idle');
                    this.endPlayerTurn();
                }
            });
        }

        endPlayerTurn() {
            this.gameState = 'ENEMY_TURN';
            this.startEnemyTurn();
        }

        startEnemyTurn() {
            this.enemyTurnIndex = 0;
            this.handleNextEnemy();
        }

        handleNextEnemy() {
            if (this.enemyTurnIndex >= this.enemies.length) {
                this.endEnemyTurn();
                return;
            }

            const currentEnemy = this.enemies[this.enemyTurnIndex];
            this.takeEnemyTurn(currentEnemy, () => {
                this.enemyTurnIndex++;
                this.handleNextEnemy();
            });
        }

        endEnemyTurn() {
            this.gameState = 'PLAYER_TURN';
        }

        takeEnemyTurn(enemy, onTurnComplete) {
            // Distance check
            const dx = this.playerGridPos.x - enemy.gridPos.x;
            const dy = this.playerGridPos.y - enemy.gridPos.y;
            const distance = Math.abs(dx) + Math.abs(dy);

            if (distance <= 1) {
                // Attack
                if (enemy.sprite.anims.currentAnim.key !== 'orc_attack') {
                    if (dx === -1 || dy === 1) { // Player is left-ish
                        enemy.sprite.flipX = true;
                    } else if (dx === 1 || dy === -1) { // Player is right-ish
                        enemy.sprite.flipX = false;
                    }
                    enemy.sprite.play('orc_attack');
                    enemy.sprite.once('animationcomplete', () => {
                        enemy.sprite.play('orc_idle');
                        onTurnComplete();
                    });
                } else {
                    onTurnComplete();
                }
            } else {
                // --- Find a valid target tile next to the player ---
                const targetableTiles = [];
                const neighbors = [
                    { x: this.playerGridPos.x + 1, y: this.playerGridPos.y }, // East
                    { x: this.playerGridPos.x - 1, y: this.playerGridPos.y }, // West
                    { x: this.playerGridPos.x, y: this.playerGridPos.y + 1 }, // South
                    { x: this.playerGridPos.x, y: this.playerGridPos.y - 1 }  // North
                ];

                for (const neighbor of neighbors) {
                    if (neighbor.x >= 0 && neighbor.x < this.mapConsts.MAP_SIZE &&
                        neighbor.y >= 0 && neighbor.y < this.mapConsts.MAP_SIZE &&
                        this.grid[neighbor.y][neighbor.x] === 0) {
                        targetableTiles.push(neighbor);
                    }
                }

                if (targetableTiles.length > 0) {
                    const target = targetableTiles.sort((a, b) => {
                        const distA = Math.abs(a.x - enemy.gridPos.x) + Math.abs(a.y - enemy.gridPos.y);
                        const distB = Math.abs(b.x - enemy.gridPos.x) + Math.abs(b.y - enemy.gridPos.y);
                        return distA - distB;
                    })[0];

                    this.easystar.avoidAdditionalPoint(this.playerGridPos.x, this.playerGridPos.y);
                    this.easystar.findPath(enemy.gridPos.x, enemy.gridPos.y, target.x, target.y, (path) => {
                        if (path && path.length > 1) {
                            const truncatedPath = path.slice(0, Math.min(path.length, enemy.moveLimit + 1));
                            this.moveEnemyAlongPath(enemy, truncatedPath, onTurnComplete);
                        } else {
                            onTurnComplete(); // No path found, end turn
                        }
                    });
                    this.easystar.calculate();
                    this.easystar.stopAvoidingAdditionalPoint(this.playerGridPos.x, this.playerGridPos.y);
                } else {
                    onTurnComplete(); // No targetable tiles, end turn
                }
            }
        }

        moveEnemyAlongPath(enemy, path, onCompleteCallback) {
            if (!path || path.length <= 1) {
                if (onCompleteCallback) onCompleteCallback();
                return;
            }

            enemy.sprite.play('orc_walk');
            const tweens = [];

            for (let i = 1; i < path.length; i++) {
                const prevPos = path[i - 1];
                const nextPos = path[i];
                const dx = nextPos.x - prevPos.x;
                const dy = nextPos.y - prevPos.y;

                const screenX = this.origin.x + (nextPos.x - nextPos.y) * this.mapConsts.HALF_WIDTH;
                const screenY = this.origin.y + (nextPos.x + nextPos.y) * this.mapConsts.QUARTER_HEIGHT;

                tweens.push({
                    targets: enemy.sprite,
                    x: screenX,
                    y: screenY - 16,
                    duration: 200,
                    onStart: () => {
                        if (dx === -1 || dy === 1) enemy.sprite.flipX = true;
                        else if (dx === 1 || dy === -1) enemy.sprite.flipX = false;
                    },
                    onComplete: () => {
                        enemy.gridPos.x = nextPos.x;
                        enemy.gridPos.y = nextPos.y;
                        enemy.sprite.setDepth(9999998);
                    }
                });
            }

            this.tweens.chain({
                tweens: tweens,
                onComplete: () => {
                    enemy.sprite.play('orc_idle');
                    if (onCompleteCallback) onCompleteCallback();
                }
            });
        }
    }