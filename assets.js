export default {
    // 'audio': {
    //     score: {
    //         key: 'sound',
    //         args: ['assets/sound.mp3', 'assets/sound.m4a', 'assets/sound.ogg']
    //     },
    // },
    'image': {
        button_background: {
            key: 'button_background',
            args: ['src/assets/user_interface/button_background.png']
        },
        bg_main_screen: {
            key: 'bg_main_screen',
            args: ['src/assets/main_screen/bg_main_screen.png']
        },
        title_main_screen: {
            key: 'title_main_screen',
            args: ['src/assets/main_screen/title_main_screen.png']
        },
        ability_bar: {
            key: 'ability_bar',
            args: ['src/assets/sprites/ui/ability_bar.png']
        },
        level_bg: {
            key: 'level_bg',
            args: ['src/assets/backgrounds/level_bg.png']
        },
        forest_tiles: {
            key: 'forest_tiles',
            args: ['src/assets/sprites/terrain/forest_tile.png']
        },
        obstacle_tree: {
            key: 'obstacle_tree',
            args: ['src/assets/sprites/terrain/forest.png']
        }
    },
    'spritesheet': {
        items: {
            key: 'items',
            args: ['src/assets/sprites/units/items.png', {
                frameWidth: 32,
                frameHeight: 32,
            }]
        },
        npc: {
            key: 'npc',
            args: ['src/assets/sprites/units/base_unit.png', {
                frameWidth: 32,
                frameHeight: 32,
            }]
        },
        ability_atlas: {
            key: 'ability_atlas',
            args: ['src/assets/sprites/ui/ability_atlas.png', {
                frameWidth: 12,
                frameHeight: 12,
                margin: 0,
                spacing: 4
            }]
        },
        basic_unit: {
            key: 'basic_unit',
            args: ['src/assets/sprites/units/basic_units.png', {
                frameWidth: 32,
                frameHeight: 32,
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