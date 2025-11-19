export class LevelGenerator {
    static generate(config) {
        const width = 128;
        const height = 128;
        const baseTileIds = [10, 11, 12]; // New IDs for base tiles
        const grid = [];

        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                const randomTileId = baseTileIds[Math.floor(Math.random() * baseTileIds.length)];
                row.push(randomTileId);
            }
            grid.push(row);
        }

        // Place objects that affect the grid
        config.objects.forEach(obj => {
            if (obj.type === 'obstacle') {
                if (grid[obj.position.y] && grid[obj.position.y][obj.position.x] !== undefined) {
                    // Check if the tile is a base walkable tile before placing a walkable_obstacle
                    if (baseTileIds.includes(grid[obj.position.y][obj.position.x])) {
                         grid[obj.position.y][obj.position.x] = 3; // 3 is walkable_obstacle tile type
                    }
                }
            }
        });

        return {
            layout: grid,
            objects: config.objects,
            tileset: config.tileset,
            mapSize: { width: width, height: height }
        };
    }
}

