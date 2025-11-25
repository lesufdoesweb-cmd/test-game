// src/systems/MapManager.js
import {LevelGenerator} from "../LevelGenerator.js";
/* global EasyStar */

export class MapManager {
    constructor(scene) {
        this.scene = scene;
        this.easystar = null;
        this.grid = [];
        this.walkableTiles = [];
        this.mapConsts = {
            MAP_SIZE_X: 0,
            MAP_SIZE_Y: 0,
            TILE_WIDTH: 48,
            HALF_WIDTH: 0,
            QUARTER_HEIGHT: 0,
        };
        this.origin = {x: 0, y: 0};
    }

    initialize(levelConfig, origin) {
        this.origin = origin;
        const levelData = LevelGenerator.generate(levelConfig);

        this.mapConsts.HALF_WIDTH = this.mapConsts.TILE_WIDTH / 2;
        this.mapConsts.QUARTER_HEIGHT = this.mapConsts.TILE_WIDTH / 4;
        this.mapConsts.MAP_SIZE_X = levelData.mapSize.width;
        this.mapConsts.MAP_SIZE_Y = levelData.mapSize.height;

        this.easystar = new EasyStar.js();
        this.grid = levelData.layout;
        this.easystar.setGrid(this.grid);

        this.walkableTiles = Object.keys(levelData.tileset)
            .filter(k => levelData.tileset[k].type === 'walkable' || levelData.tileset[k].type === 'bridge')
            .map(k => parseInt(k));
        this.easystar.setAcceptableTiles(this.walkableTiles);

        levelData.objects.forEach(obj => {
            if (obj.type === 'scenery') {
                this.easystar.avoidAdditionalPoint(obj.position.x, obj.position.y);
            }
        });

        return levelData;
    }

    renderMap(levelData) {
        for (let gridY = 0; gridY < this.mapConsts.MAP_SIZE_Y; gridY++) {
            for (let gridX = 0; gridX < this.mapConsts.MAP_SIZE_X; gridX++) {
                const tileType = this.grid[gridY][gridX];
                if (tileType === -1) continue;

                const screenX = this.origin.x + (gridX - gridY) * this.mapConsts.HALF_WIDTH;
                const screenY = this.origin.y + (gridX + gridY) * this.mapConsts.QUARTER_HEIGHT;

                const tileInfo = levelData.tileset[tileType];
                if (tileInfo && tileInfo.assetKey) {
                    const tile = this.scene.add.image(screenX, screenY, tileInfo.assetKey);
                    tile.setOrigin(0.5, 0.375);
                    tile.setDepth(gridX + gridY);

                    tile.setData('finalY', screenY);
                    tile.setData('gridSum', gridX + gridY);
                    tile.y += 300;
                    tile.alpha = 0;
                    this.scene.animTiles.push(tile);

                    if (tileInfo.assetKey.startsWith('base_') && Math.random() < 0.3) {
                        const tileWidth = tile.displayWidth;
                        const tileHeight = tile.displayHeight;

                        const randomFrequency = Phaser.Math.Between(1500, 3000);
                        const randomDelay = Math.random() * 2000;

                        const emitter = this.scene.add.particles(screenX, screenY, 'particle', {
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
                    tile.setInteractive({ pixelPerfect: true });

                    tile.on('pointerover', () => {
                        tile.setTint(0xffffff);
                        this.scene.tweens.add({
                            targets: tile,
                            y: tile.getData('finalY') - 2,
                            duration: 100,
                            ease: 'Sine.easeOut'
                        });
                    });

                    tile.on('pointerout', () => {
                        tile.setTint(tile.getData('originalTint'));
                        this.scene.tweens.add({
                            targets: tile,
                            y: tile.getData('finalY'),
                            duration: 100,
                            ease: 'Sine.easeIn'
                        });
                    });
                }
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

    findPath(start, end, callback) {
        this.easystar.findPath(start.x, start.y, end.x, end.y, callback);
        this.easystar.calculate();
    }
}
