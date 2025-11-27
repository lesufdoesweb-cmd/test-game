export default {
    // 'audio': {
    //     score: {
    //         key: 'sound',
    //         args: ['assets/sound.mp3', 'assets/sound.m4a', 'assets/sound.ogg']
    //     },
    // },
    'image': {
        tree: {
            key: 'tree',
            args: ['src/assets/map_objects/tree_1.png']
        },
        archer: {
            key: 'archer',
            args: ['src/assets/units/archer.png']
        },
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
        base_1: {
            key: 'base_1',
            args: ['src/assets/better_tiles/forest_tile_1.png']
        },
        base_2: {
            key: 'base_2',
            args: ['src/assets/better_tiles/forest_tile_2.png']
        },
        base_3: {
            key: 'base_3',
            args: ['src/assets/better_tiles/forest_tile_3.png']
        },
        dirt_1: {
            key: 'dirt_1',
            args: ['src/assets/better_tiles/dirt_1.png']
        },
        dirt_2: {
            key: 'dirt_2',
            args: ['src/assets/tiles/dirt_2.png']
        },
        obstacle_tree: {
            key: 'obstacle_tree',
            args: ['src/assets/sprites/terrain/forest.png']
        },
        timeline_bg: {
            key: 'timeline_bg',
            args: ['src/assets/user_interface/timeline_bg.png']
        },
        arrow_attack_icon: {
            key: 'arrow_attack_icon',
            args: ['src/assets/ability_icons/arrow_attack.png']
        },
        move_icon: {
            key: 'move_icon',
            args: ['src/assets/ability_icons/move.png']
        },
        basic_attack_icon: {
            key: 'basic_attack_icon',
            args: ['src/assets/ability_icons/basic_attack.png']
        },
        ork: {
            key: 'ork',
            args: ['src/assets/units/ork.png']
        },
        spider: {
            key: 'spider',
            args: ['src/assets/units/spider.png']
        },
        knight: {
            key: 'knight',
            args: ['src/assets/units/knight.png']
        },
        armor_up_icon: {
            key: 'armor_up_icon',
            args: ['src/assets/ability_icons/armor_up.png']
        },
        arrow_projectile: {
            key: 'arrow_projectile',
            args: ['src/assets/projectiles/arrow.png']
        },
        melee_slash_effect: {
            key: 'melee_slash_effect',
            args: ['src/assets/projectiles/melee_slash.png']
        },
        tooltip_bg: {
            key: 'tooltip_bg',
            args: ['src/assets/user_interface/bg_tooltip.png']
        },
        bg_character_info: {
            key: 'bg_character_info',
            args: ['src/assets/user_interface/bg_character_info.png']
        },
        basic_button: {
            key: 'basic_button',
            args: ['src/assets/user_interface/basic_button.png']
        },
        start_button: {
            key: 'start_button',
            args: ['src/assets/user_interface/start_button_2.png']
        },
        bg_fights: {
            key: 'bg_fights',
            args: ['src/assets/backgrounds/bg_fights.png']
        },
        arrow_rain_icon: {
            key: 'arrow_rain_icon',
            args: ['src/assets/ability_icons/arrow_rain.png']
        },
        trap_icon: {
            key: 'trap_icon',
            args: ['src/assets/ability_icons/trap.png']
        },
        bear_trap: {
            key: 'bear_trap',
            args: ['src/assets/projectiles/bear_trap.png']
        },
        paladin: {
            key: 'paladin',
            args: ['src/assets/units/paladin.png']
        },
        basic_heal_icon: {
            key: 'basic_heal_icon',
            args: ['src/assets/ability_icons/basic_heal.png']
        },
        wizard: {
            key: 'wizard',
            args: ['src/assets/units/wizard.png']
        },
        fireball_icon: {
            key: 'fireball_icon',
            args: ['src/assets/ability_icons/fireball.png']
        },
        fireball_projectile: {
            key: 'fireball_projectile',
            args: ['src/assets/projectiles/fireball.png']
        },
        freeze_icon: {
            key: 'freeze_icon',
            args: ['src/assets/ability_icons/freeze.png']
        },
        freeze_ball_projectile: {
            key: 'freeze_ball_projectile',
            args: ['src/assets/projectiles/freeze_ball.png']
        },
        bg_char_selection: {
            key: 'bg_char_selection',
            args: ['src/assets/backgrounds/bg_char_selection.png']
        },
        unit_card_common: {
            key: 'unit_card_common',
            args: ['src/assets/user_interface/unit_card_common.png']
        },
        unit_card_rare: {
            key: 'unit_card_rare',
            args: ['src/assets/user_interface/unit_card_rare.png']
        },
        unit_card_epic: {
            key: 'unit_card_epic',
            args: ['src/assets/user_interface/unit_card_epic.png']
        },
        unit_card_legendary: {
            key: 'unit_card_legendary',
            args: ['src/assets/user_interface/unit_card_legendary.png']
        },
        refresh_button: {
            key: 'refresh_button',
            args: ['src/assets/user_interface/refresh_button.png']
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