export const testMap = {
    name: "Test Map",
    tileset: {
        "-1": { type: 'void' },
        2: { type: 'bridge', assetKey: 'base_1' },
        3: { type: 'walkable_obstacle', assetKey: 'base_1' },
        10: { type: 'walkable', assetKey: 'base_1' },
        11: { type: 'walkable', assetKey: 'base_2' },
        12: { type: 'walkable', assetKey: 'base_3' },
        13: { type: 'walkable', assetKey: 'dirt_1' },
        14: { type: 'walkable', assetKey: 'dirt_2' }
    },
    objects: [
        { type: 'scenery', assetKey: 'tree', position: { x: 1, y: 4 } },
        { type: 'scenery', assetKey: 'tree', position: { x: 6, y: 4 } },
        { type: 'scenery', assetKey: 'tree', position: { x: 2, y: 6 } },
        { type: 'scenery', assetKey: 'tree', position: { x: 5, y: 6 } },
    ]
};
