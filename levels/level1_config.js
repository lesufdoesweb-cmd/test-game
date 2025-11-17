export const level1Config = {
    name: "The First Step",
    mapSize: { width: 30, height: 20 },
    tileset: {
        0: { type: 'walkable', assetKey: 'forest_tiles' },
        1: { type: 'obstacle', assetKey: 'rock_tile' },
        2: { type: 'bridge', assetKey: 'forest_tiles' } // Placeholder, assuming no bridge tile yet
    },
    regions: [
        {
            id: 'start',
            type: 'rect',
            position: { x: 2, y: 7 },
            size: { width: 6, height: 6 },
            fill: 0
        },
        {
            id: 'end',
            type: 'rect',
            position: { x: 20, y: 5 },
            size: { width: 8, height: 8 },
            fill: 0
        }
    ],
    connections: [
        {
            from: 'start',
            to: 'end',
            type: 'bridge',
            width: 2,
            fill: 2
        }
    ],
    placements: [
        { type: 'player_start', position: { x: 4, y: 10 } },
        { type: 'enemy', enemyType: 'Orc', position: { x: 22, y: 8 } }
    ]
};
