export const level1Config = {
    name: "The First Step",
    tileset: {
        "-1": { type: 'void' },
        1: { type: 'obstacle', assetKey: 'obstacle_tree' },
        2: { type: 'bridge', assetKey: 'base_1' },
        3: { type: 'walkable_obstacle', assetKey: 'base_1' },
        10: { type: 'walkable', assetKey: 'base_1' },
        11: { type: 'walkable', assetKey: 'base_2' },
        12: { type: 'walkable', assetKey: 'base_3' },
        13: { type: 'walkable', assetKey: 'dirt_1' },
        14: { type: 'walkable', assetKey: 'dirt_2' }
    },
    objects: [
        { type: 'unit', unitType: 'Archer', position: { x: 4, y: 10 } },
        { type: 'unit', unitType: 'Archer', position: { x: 5, y: 10 } },
        { type: 'unit', unitType: 'Knight', position: { x: 3, y: 10 } },
        { type: 'unit', unitType: 'Orc', position: { x: 5, y: 5 } },
        { type: 'unit', unitType: 'Spider', position: { x: 4, y: 5 } },
        { type: 'unit', unitType: 'Spider', position: { x: 6, y: 5 } },
        { type: 'unit', unitType: 'Spider', position: { x: 7, y: 5 } },
    ]
};