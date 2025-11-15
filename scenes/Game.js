import ASSETS from '../assets.js';

export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        // --- Tilemap creation ---
        const mapWidth = 20;
        const mapHeight = 20;
        const tileWidth = 32;
        const tileHeight = 32;

        const mapData = [];
        for (let y = 0; y < mapHeight; y++) {
            const row = [];
            for (let x = 0; x < mapWidth; x++) {
                // Use a simple grass tile (e.g., index 50 from the original game)
                row.push(50);
            }
            mapData.push(row);
        }

        // Create the map with isometric orientation
        this.map = this.make.tilemap({
            data: mapData,
            tileWidth: tileWidth,
            tileHeight: tileHeight,
            width: mapWidth,
            height: mapHeight,
            orientation: 'isometric' // This is the key part for isometric view
        });

        const tileset = this.map.addTilesetImage(ASSETS.spritesheet.tiles.key, null, tileWidth, tileHeight, 0, 0);
        const layer = this.map.createLayer(0, tileset, 0, 0);

        // Center the map
        const mapPixelWidth = this.map.widthInPixels;
        const mapPixelHeight = this.map.heightInPixels;
        layer.setPosition((this.scale.width - mapPixelWidth) / 2, (this.scale.height - mapPixelHeight) / 2 + 100);


        // --- Player creation ---
        // Get the center of the isometric map in world coordinates
        const playerTileX = Math.floor(mapWidth / 2);
        const playerTileY = Math.floor(mapHeight / 2);

        // Convert tile coordinates to world coordinates for isometric map
        const playerWorldPos = this.map.tileToWorldXY(playerTileX, playerTileY);

        // Add player sprite. We'll use the ship sprite as a placeholder.
        this.player = this.add.sprite(
            playerWorldPos.x + layer.x + tileWidth/2, // Adjust for tile center
            playerWorldPos.y + layer.y, // Adjust for sprite origin
            ASSETS.spritesheet.ships.key,
            8 // Frame 8 from the shmup game
        ).setOrigin(0.5, 1); // Set origin to bottom center for better placement on tiles

        // Add a title text
        this.add.text(this.scale.width * 0.5, 50, 'Isometric Turn-Based Game', {
            fontFamily: 'Arial Black', fontSize: 42, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);
    }
}
