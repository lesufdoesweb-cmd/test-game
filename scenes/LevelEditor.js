import { level1Config } from '../levels/level1_config.js'; // Used for tileset copy

export class LevelEditor extends Phaser.Scene {
    constructor() {
        super('LevelEditor');
        this.grid = [];
        this.objectMarkers = {};
        this.editMode = 'tile'; // 'tile' or 'object'
        this.currentTileType = 0;
        this.currentObjectType = 'player_start';
        this.mapConfig = null;
    }

    init(data) {
        if (data && data.levelConfig) {
            // Load existing config for editing
            this.mapConfig = JSON.parse(JSON.stringify(data.levelConfig));
        } else {
            // Initialize a blank config for a new level
            this.mapConfig = {
                name: "New Level",
                mapSize: { width: 30, height: 20 },
                tileset: JSON.parse(JSON.stringify(level1Config.tileset)),
                layout: Array(20).fill(null).map(() => Array(30).fill(-1)), // Start with a void layout
                objects: []
            };
        }
    }

    create() {
        const { width, height } = this.scale;
        const mapWidth = this.mapConfig.mapSize.width;
        const mapHeight = this.mapConfig.mapSize.height;
        const tileWidth = 20;
        const tileHeight = 20;

        const gridContainer = this.add.container((width - mapWidth * tileWidth) / 2, (height - mapHeight * tileHeight) / 2);

        // --- Grid ---
        for (let y = 0; y < mapHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < mapWidth; x++) {
                const tileType = this.mapConfig.layout[y][x];
                const tile = this.add.rectangle(x * tileWidth, y * tileHeight, tileWidth, tileHeight, this.getTileColor(tileType))
                    .setStrokeStyle(1, 0x444444)
                    .setInteractive();

                tile.on('pointerdown', (pointer) => {
                    if (pointer.leftButtonDown()) {
                        this.paint(x, y);
                    } else if (pointer.rightButtonDown()) {
                        this.erase(x, y);
                    }
                });
                 tile.on('pointerover', (pointer) => {
                    if (pointer.isDown) {
                        this.paint(x, y);
                    }
                });
                
                this.grid[y][x] = tile;
                gridContainer.add(tile);
            }
        }
        this.mapConfig.objects.forEach(obj => this.drawObjectMarker(obj));

        // --- UI ---
        this.createPaletteUI();
        this.createSaveLoadUI();
    }
    
    createButton(x, y, text, onClick) {
        const button = this.add.text(x, y, text, {
            fontSize: '16px', backgroundColor: '#333', padding: { x: 8, y: 4 }, fontFamily: 'Pixelify-Sans'
        }).setInteractive({ useHandCursor: true }).setOrigin(0.5);

        button.on('pointerdown', onClick);
        return button;
    }

    createPaletteUI() {
        // --- Mode Switcher ---
        this.createButton(100, 50, 'Paint Tiles', () => this.editMode = 'tile');
        this.createButton(100, 100, 'Place Objects', () => this.editMode = 'object');

        // --- Tile Palette ---
        let tilePaletteX = 200;
        Object.keys(this.mapConfig.tileset).forEach(key => {
            const tileType = parseInt(key, 10);
            if (tileType === 1 || tileType === 3) return; // Don't allow painting obstacle tiles directly
            
            const button = this.add.rectangle(tilePaletteX, 50, 30, 30, this.getTileColor(tileType))
                .setStrokeStyle(2, 0xffffff)
                .setInteractive({ useHandCursor: true });
            
            button.on('pointerdown', () => {
                this.editMode = 'tile';
                this.currentTileType = tileType;
            });
            tilePaletteX += 40;
        });

        // --- Object Palette ---
        const objectTypes = ['player_start', 'enemy', 'obstacle', 'chest', 'npc'];
        let objectPaletteX = 200;
        objectTypes.forEach(type => {
            const button = this.createButton(objectPaletteX, 100, type, () => {
                this.editMode = 'object';
                this.currentObjectType = type;
            });
            objectPaletteX += button.width + 10;
        });
    }

    createSaveLoadUI() {
        const { width, height } = this.scale;
        // --- Save Button ---
        this.createButton(width - 100, 50, 'Save', () => {
            const levelName = prompt("Enter a name for the level config (e.g., level2):", this.mapConfig.name);
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

            alert(`Level config saved as ${fileName}. Please move it to the 'src/levels' directory and refresh the page to see it in the level selector.`);
        });

        // --- Back Button ---
        this.createButton(width - 100, height - 50, 'Back to Menu', () => {
            this.scene.start('MainMenu');
        });
    }

    paint(x, y) {
        if (this.editMode === 'tile') {
            this.mapConfig.layout[y][x] = this.currentTileType;
            this.grid[y][x].setFillStyle(this.getTileColor(this.currentTileType));
        } else if (this.editMode === 'object') {
            // Auto-place ground if the tile is void
            if (this.mapConfig.layout[y][x] === -1) {
                this.mapConfig.layout[y][x] = 0; // Default ground tile
                this.grid[y][x].setFillStyle(this.getTileColor(0));
            }
            
            // Remove existing object at this position first
            this.removeObject(x, y, false);

            const newObj = { type: this.currentObjectType, position: { x, y } };
            if (this.currentObjectType === 'enemy') newObj.enemyType = 'Orc';
            if (this.currentObjectType === 'chest') newObj.items = [];
            if (this.currentObjectType === 'npc') newObj.npcType = 'old_man';

            this.mapConfig.objects.push(newObj);
            this.drawObjectMarker(newObj);
        }
    }

    erase(x, y) {
        this.removeObject(x, y, true);
    }

    removeObject(x, y, eraseTile) {
        const key = `${x},${y}`;
        if (this.objectMarkers[key]) {
            this.objectMarkers[key].destroy();
            delete this.objectMarkers[key];
        }
        this.mapConfig.objects = this.mapConfig.objects.filter(obj => {
            return obj.position.x !== x || obj.position.y !== y;
        });
        if (eraseTile) {
            this.mapConfig.layout[y][x] = -1; // Set tile to void
            this.grid[y][x].setFillStyle(this.getTileColor(-1));
        }
    }

    drawObjectMarker(obj) {
        const key = `${obj.position.x},${obj.position.y}`;
        const tile = this.grid[obj.position.y][obj.position.x];
        
        let color = 0xffffff;
        let symbol = '?';
        switch(obj.type) {
            case 'player_start': color = 0x0000ff; symbol = 'P'; break;
            case 'enemy': color = 0xff0000; symbol = 'E'; break;
            case 'obstacle': color = 0x8B4513; symbol = 'O'; break;
            case 'chest': color = 0xFFFF00; symbol = 'C'; break;
            case 'npc': color = 0x00ff00; symbol = 'N'; break;
        }

        const marker = this.add.text(tile.x, tile.y, symbol, { fontSize: '16px', fill: `#${color.toString(16)}`, fontFamily: 'Pixelify-Sans'}).setOrigin(0.5);
        marker.setDepth(tile.depth + 1);
        this.grid[0][0].parentContainer.add(marker);
        this.objectMarkers[key] = marker;
    }
    
    getTileColor(tileType) {
        switch(tileType) {
            case 0: return 0x6B8E23; // Walkable
            case 2: return 0x0000FF; // Bridge
            case 3: return 0x6B8E23; // Walkable Obstacle (looks same as walkable)
            default: return 0x1a1a1a; // Void
        }
    }
}
