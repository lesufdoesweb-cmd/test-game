export class LevelGenerator {
    static generate(config) {
        // 1. Initialize grid with -1 (void)
        const grid = Array(config.mapSize.height).fill(null).map(() => Array(config.mapSize.width).fill(-1));

        // 2. Carve regions
        config.regions.forEach(region => {
            if (region.type === 'rect') {
                for (let y = region.position.y; y < region.position.y + region.size.height; y++) {
                    for (let x = region.position.x; x < region.position.x + region.size.width; x++) {
                        if (x >= 0 && x < config.mapSize.width && y >= 0 && y < config.mapSize.height) {
                            grid[y][x] = region.fill;
                        }
                    }
                }
            }
        });

        // 3. Carve connections
        config.connections.forEach(conn => {
            const regionA = config.regions.find(r => r.id === conn.from);
            const regionB = config.regions.find(r => r.id === conn.to);
            if (!regionA || !regionB) return;

            const centerA = { x: Math.floor(regionA.position.x + regionA.size.width / 2), y: Math.floor(regionA.position.y + regionA.size.height / 2) };
            const centerB = { x: Math.floor(regionB.position.x + regionB.size.width / 2), y: Math.floor(regionB.position.y + regionB.size.height / 2) };

            // Simple L-shaped path
            let currentX = centerA.x;
            let currentY = centerA.y;

            while (currentX !== centerB.x) {
                grid[currentY][currentX] = conn.fill;
                if (conn.width > 1) grid[currentY + 1][currentX] = conn.fill; // crude width
                currentX += Math.sign(centerB.x - currentX);
            }
            while (currentY !== centerB.y) {
                grid[currentY][currentX] = conn.fill;
                if (conn.width > 1) grid[currentY][currentX -1] = conn.fill; // crude width
                currentY += Math.sign(centerB.y - currentY);
            }
        });

        // 4. Get placements
        const playerStart = config.placements.find(p => p.type === 'player_start').position;
        const enemies = config.placements.filter(p => p.type === 'enemy');

        return {
            layout: grid,
            playerStart: playerStart,
            enemies: enemies.map(e => ({ type: e.enemyType, pos: e.position })),
            tileset: config.tileset,
            mapSize: config.mapSize
        };
    }
}
