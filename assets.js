export default {
    // 'audio': {
    //     score: {
    //         key: 'sound',
    //         args: ['assets/sound.mp3', 'assets/sound.m4a', 'assets/sound.ogg']
    //     },
    // },
    'image': {
        level_bg: {
            key: 'level_bg',
            args: ['src/assets/backgrounds/level_bg.png']
        },
        forest_tiles: {
            key: 'forest_tiles',
            args: ['src/assets/sprites/terrain/forest_tile.png']
        },
        rock_tile: {
            key: 'rock_tile',
            args: ['src/assets/sprites/terrain/forest.png']
        }
    },
    'spritesheet': {
        basic_unit: {
            key: 'basic_unit',
            args: ['src/assets/sprites/units/base_unit.png', {
                frameWidth: 16,
                frameHeight: 16,
            }]
        },
        player_unit: {
            key: 'player_unit',
            args: ['src/assets/sprites/units/base_unit.png', {
                frameWidth: 16,
                frameHeight: 16,
            }]
        },
        ships: {
            key: 'ships',
            args: ['assets/ships.png', {
                frameWidth: 64,
                frameHeight: 64,
            }]
        },
        tiles: {
            key: 'tiles',
            args: ['assets/tiles.png', {
                frameWidth: 32,
                frameHeight: 32
            }]
        },
    }
};