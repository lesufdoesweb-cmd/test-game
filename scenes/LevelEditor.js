import { level1Config } from '../levels/level1_config.js'; // Used for tileset copy

export class LevelEditor extends Phaser.Scene {
    constructor() {
        super('LevelEditor');
        this.grid = [];
        this.objectMarkers = {};
        this.editMode = 'tile'; // 'tile' or 'object'
        this.currentTileType = 10; // Default to a base tile
        this.currentObjectType = 'player_start';
        this.mapConfig = null;
        this.gridContainer = null;
        this.history = [];
        this.historyIndex = -1;
    }

    init(data) {
        if (data && data.levelConfig) {
            this.mapConfig = JSON.parse(JSON.stringify(data.levelConfig));
            if (!this.mapConfig.mapSize) this.mapConfig.mapSize = { width: 128, height: 128 };
            if (!this.mapConfig.layout) this.mapConfig.layout = Array(this.mapConfig.mapSize.height).fill(null).map(() => Array(this.mapConfig.mapSize.width).fill(-1));
            if (!this.mapConfig.objects) this.mapConfig.objects = [];
        } else {
            const mapSize = { width: 128, height: 128 };
            this.mapConfig = {
                name: "New Level",
                mapSize: mapSize,
                tileset: JSON.parse(JSON.stringify(level1Config.tileset)),
                layout: Array(mapSize.height).fill(null).map(() => Array(mapSize.width).fill(-1)),
                objects: []
            };
        }
    }

    create() {
        const { width, height } = this.scale;
        const mapWidth = this.mapConfig.mapSize.width;
        const mapHeight = this.mapConfig.mapSize.height;
        const tileWidth = 16;
        const tileHeight = 16;

        this.gridContainer = this.add.container((width - mapWidth * tileWidth) / 2, (height - mapHeight * tileHeight) / 2);

        // --- Grid ---
        for (let y = 0; y < mapHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < mapWidth; x++) {
                const tileType = (this.mapConfig.layout[y] && this.mapConfig.layout[y][x]) ? this.mapConfig.layout[y][x] : -1;
                const tile = this.add.rectangle(x * tileWidth, y * tileHeight, tileWidth, tileHeight, this.getTileColor(tileType))
                    .setStrokeStyle(1, 0x444444);
                this.grid[y][x] = tile;
                this.gridContainer.add(tile);
            }
        }
        this.mapConfig.objects.forEach(obj => this.drawObjectMarker(obj));

        // --- UI ---
        this.createPaletteUI();
        this.createSaveLoadUI();

        // --- Input Handling for Grid ---
        this.input.on('pointerdown', (pointer) => {
            if (pointer.y < 150) return;

            const localPoint = this.gridContainer.getWorldTransformMatrix().applyInverse(pointer.x, pointer.y);
            const gridX = Math.floor(localPoint.x / tileWidth);
            const gridY = Math.floor(localPoint.y / tileHeight);

            if (gridX >= 0 && gridX < mapWidth && gridY >= 0 && gridY < mapHeight) {
                if (pointer.leftButtonDown()) {
                    this.paint(gridX, gridY);
                } else if (pointer.rightButtonDown()) {
                    this.erase(gridX, gridY);
                }
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown) {
                if (pointer.middleButtonDown()) {
                    this.gridContainer.x += pointer.x - pointer.prevPosition.x;
                    this.gridContainer.y += pointer.y - pointer.prevPosition.y;
                } else if (pointer.leftButtonDown() && pointer.y >= 150) {
                    const localPoint = this.gridContainer.getWorldTransformMatrix().applyInverse(pointer.x, pointer.y);
                    const gridX = Math.floor(localPoint.x / tileWidth);
                    const gridY = Math.floor(localPoint.y / tileHeight);
                    if (gridX >= 0 && gridX < mapWidth && gridY >= 0 && gridY < mapHeight) {
                        this.paint(gridX, gridY);
                    }
                }
            }
        });

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            const newScale = this.gridContainer.scale + (deltaY > 0 ? -0.1 : 0.1);
            if (newScale >= 0.2 && newScale <= 3) {
                 this.gridContainer.setScale(newScale);
            }
        });
        
        // --- Undo Listener ---
        this.input.keyboard.on('keydown', (event) => {
            if (event.ctrlKey && (event.key === 'z' || event.key === 'Z')) {
                this.undo();
            }
        });

        this.saveState(); // Save initial state
    }
    
    saveState() {
        this.history.splice(this.historyIndex + 1);
        this.history.push(JSON.parse(JSON.stringify(this.mapConfig)));
        this.historyIndex++;
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.mapConfig = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.redrawAll();
        }
    }

    redrawAll() {
        const mapHeight = this.mapConfig.mapSize.height;
        const mapWidth = this.mapConfig.mapSize.width;
        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                const tileType = (this.mapConfig.layout[y] && this.mapConfig.layout[y][x]) ? this.mapConfig.layout[y][x] : -1;
                if (this.grid[y] && this.grid[y][x]) {
                    this.grid[y][x].setFillStyle(this.getTileColor(tileType));
                }
            }
        }

        for (const key in this.objectMarkers) {
            this.objectMarkers[key].destroy();
        }
        this.objectMarkers = {};

        this.mapConfig.objects.forEach(obj => this.drawObjectMarker(obj));
    }

    createButton(x, y, text, onClick) {
        const button = this.add.text(x, y, text, { fontSize: '16px', backgroundColor: '#333', padding: { x: 8, y: 4 }, fontFamily: 'Pixelify-Sans' })
            .setInteractive({ useHandCursor: true }).setOrigin(0.5);
        button.on('pointerdown', onClick);
        return button;
    }

    createPaletteUI() {
        this.createButton(100, 50, 'Paint Tiles', () => this.editMode = 'tile').setDepth(1);
        this.createButton(100, 100, 'Place Objects', () => this.editMode = 'object').setDepth(1);

        let tilePaletteX = 200;
        Object.keys(this.mapConfig.tileset).forEach(key => {
            const tileType = parseInt(key, 10);
            const tileInfo = this.mapConfig.tileset[key];
            if (tileInfo.type === 'void' || tileInfo.type === 'walkable_obstacle' || tileInfo.type === 'obstacle') return;

            const button = this.add.rectangle(tilePaletteX, 50, 20, 20, this.getTileColor(tileType))
                .setStrokeStyle(1, 0xffffff).setDepth(1).setInteractive({ useHandCursor: true });
            
            button.on('pointerdown', () => {
                this.editMode = 'tile';
                this.currentTileType = tileType;
            });
            tilePaletteX += 30;
        });

        const objectTypes = ['player_start', 'enemy', 'obstacle', 'chest', 'npc'];
        let objectPaletteX = 200;
        objectTypes.forEach(type => {
            const button = this.createButton(objectPaletteX, 100, type, () => {
                this.editMode = 'object';
                this.currentObjectType = type;
            });
            button.setDepth(1);
            objectPaletteX += button.width + 10;
        });
    }

    createSaveLoadUI() {
        const { width, height } = this.scale;
        this.createButton(width - 100, 50, 'Save', () => {
            const levelName = prompt("Enter a name for the level config:", this.mapConfig.name);
            if (!levelName) return;
            this.mapConfig.name = levelName;
            const configName = `${levelName}Config`;
            const fileName = `${levelName}_config.js`;
            const content = `export const ${configName} = ${JSON.stringify(this.mapConfig, null, 4)};`;
            const blob = new Blob([content], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert(`Level config saved as ${fileName}.`);
        }).setDepth(1);

        this.createButton(width - 100, height - 50, 'Back to Menu', () => this.scene.start('MainMenu')).setDepth(1);
    }

    paint(x, y) {
        let changed = false;
        if (this.editMode === 'tile') {
            if (this.mapConfig.layout[y][x] !== this.currentTileType) {
                changed = true;
                this.mapConfig.layout[y][x] = this.currentTileType;
                this.grid[y][x].setFillStyle(this.getTileColor(this.currentTileType));
            }
        } else if (this.editMode === 'object') {
            const existingObjectOnTile = this.mapConfig.objects.find(obj => obj.position.x === x && obj.position.y === y);
            if (existingObjectOnTile && existingObjectOnTile.type === this.currentObjectType) return;
            
            changed = true;

            if (this.currentObjectType === 'player_start') {
                const existingPlayer = this.mapConfig.objects.find(obj => obj.type === 'player_start');
                if (existingPlayer) {
                    this.removeObject(existingPlayer.position.x, existingPlayer.position.y, false);
                }
            }
            this.removeObject(x, y, false);

            const newObj = { type: this.currentObjectType, position: { x, y } };
            if (this.currentObjectType === 'enemy') newObj.enemyType = 'Orc';
            if (this.currentObjectType === 'chest') newObj.items = [];
            if (this.currentObjectType === 'npc') newObj.npcType = 'old_man';
            this.mapConfig.objects.push(newObj);
            this.drawObjectMarker(newObj);
        }

        if (changed) {
            this.saveState();
        }
    }

    erase(x, y) {
        let changed = false;
        const obj = this.mapConfig.objects.find(o => o.position.x === x && o.position.y === y);
        if (obj) {
            changed = true;
            this.removeObject(x, y, false);
        }
        if (this.mapConfig.layout[y][x] !== -1) {
            changed = true;
            this.mapConfig.layout[y][x] = -1;
            this.grid[y][x].setFillStyle(this.getTileColor(-1));
        }

        if (changed) {
            this.saveState();
        }
    }

    removeObject(x, y, eraseTile) {
        const key = `${x},${y}`;
        if (this.objectMarkers[key]) {
            this.objectMarkers[key].destroy();
            delete this.objectMarkers[key];
        }
        this.mapConfig.objects = this.mapConfig.objects.filter(obj => obj.position.x !== x || obj.position.y !== y);
        if (eraseTile) {
            this.mapConfig.layout[y][x] = -1;
            this.grid[y][x].setFillStyle(this.getTileColor(-1));
        }
    }

    drawObjectMarker(obj) {
        const key = `${obj.position.x},${obj.position.y}`;
        if (this.objectMarkers[key]) {
            this.objectMarkers[key].destroy();
        }

        if (!this.grid[obj.position.y] || !this.grid[obj.position.y][obj.position.x]) return;

        const tile = this.grid[obj.position.y][obj.position.x];
        let color = 0xffffff, symbol = '?';
        switch (obj.type) {
            case 'player_start': color = 0x0000ff; symbol = 'P'; break;
            case 'enemy': color = 0xff0000; symbol = 'E'; break;
            case 'obstacle': color = 0x8B4513; symbol = 'O'; break;
            case 'chest': color = 0xFFFF00; symbol = 'C'; break;
            case 'npc': color = 0x00ff00; symbol = 'N'; break;
        }
        const marker = this.add.text(tile.x, tile.y, symbol, { fontSize: '12px', fill: `#${color.toString(16)}`, fontFamily: 'Pixelify-Sans' }).setOrigin(0.5);
        this.gridContainer.add(marker);
        this.objectMarkers[key] = marker;
    }

    getTileColor(tileType) {
        switch (tileType) {
            case 10: return 0x6B8E23; // base_1
            case 11: return 0x5F7C2B; // base_2
            case 12: return 0x536D2E; // base_3
            case 13: return 0x967969; // dirt_1
            case 14: return 0x816657; // dirt_2
            case 2: return 0xCD853F;  // Bridge
            case 3: // walkable_obstacle - should not be paintable, but show a color
                return 0x6B8E23; 
            default: return 0x1a1a1a; // Void
        }
    }
}

