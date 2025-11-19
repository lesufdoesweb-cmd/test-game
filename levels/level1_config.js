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
        { type: 'player_start', position: { x: 4, y: 10 } },
        { type: 'enemy', enemyType: 'Orc', position: { x: 22, y: 8 } },
        { type: 'obstacle', assetKey: 'tree', position: { x: 5, y: 8 } },
        { type: 'chest', items: ['gold', 'potion'], position: { x: 25, y: 6 } },
        { type: 'npc', npcType: 'old_man', position: { x: 3, y: 12 } }
    ]
};