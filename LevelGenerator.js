export class LevelGenerator {
    static generate(config) {
        const width = 8;
        const height = 12;
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

        // Apply layout overrides from the config
        if (config.layout && config.layout.length > 0) {
            for (let y = 0; y < config.layout.length; y++) {
                if (!config.layout[y]) continue;
                for (let x = 0; x < config.layout[y].length; x++) {
                    const tileId = config.layout[y][x];
                    // If the config has a non-void tile for this spot, use it.
                    if (tileId !== undefined && tileId !== -1) {
                        if (grid[y] && grid[y][x] !== undefined) {
                            grid[y][x] = tileId;
                        }
                    }
                }
            }
        }



        return {
            layout: grid,
            objects: config.objects,
            tileset: config.tileset,
            mapSize: { width: width, height: height }
        };
    }
}

