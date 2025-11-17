export class LevelGenerator {
    static generate(config) {
        // The layout is now directly provided by the config
        const grid = config.layout.map(row => [...row]); // Create a mutable copy

        // Place objects that affect the grid
        config.objects.forEach(obj => {
            if (obj.type === 'obstacle') {
                if (grid[obj.position.y] && grid[obj.position.y][obj.position.x] !== undefined) {
                    // Ensure the base tile is walkable before placing a walkable_obstacle
                    if (grid[obj.position.y][obj.position.x] === 0 || grid[obj.position.y][obj.position.x] === 2) {
                         grid[obj.position.y][obj.position.x] = 3; // 3 is walkable_obstacle tile type
                    }
                }
            }
        });

        return {
            layout: grid,
            objects: config.objects,
            tileset: config.tileset,
            mapSize: config.mapSize
        };
    }
}

