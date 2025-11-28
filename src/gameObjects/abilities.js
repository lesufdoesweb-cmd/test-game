// gameObjects/abilities.js
import ASSETS from '../assets.js';

export const ABILITIES = {
    'MOVE': {
        name: 'Move',
        type: 'move',
        cost: 0,
        cooldown: 1,
        currentCooldown: 0,
        icon: ASSETS.image.move_icon.key
    },
    'BASIC_ATTACK': {
        name: 'Attack',
        type: 'attack',
        range: 1,
        cost: 1,
        cooldown: 1,
        currentCooldown: 0,
        damageType: 'physical',
        modifier: 1.0,
        icon: ASSETS.image.basic_attack_icon.key
    },
'ARROW_ATTACK': {
        name: 'Arrow Attack',
        type: 'arrow_attack',
        range: 4,
        cost: 1,
        cooldown: 1,
        currentCooldown: 0,
        damageType: 'physical',
        modifier: 1.0,
        icon: ASSETS.image.arrow_attack_icon.key
    },
    'ENHANCE_ARMOR': {
        name: 'Armor Up',
        type: 'enhance_armor',
        range: 2,
        duration: 3,
        cost: 1,
        cooldown: 4,
        currentCooldown: 0,
        amount: 1,
        icon: ASSETS.image.armor_up_icon.key
    },
    'ARROW_RAIN': {
        name: 'Arrow Rain',
        type: 'arrow_rain',
        range: 99,
        aoe: {
            width: 2,
            height: 2
        },
        cost: 1,
        cooldown: 4,
        currentCooldown: 0,
        damageType: 'physical',
        modifier: 0.8,
        icon: ASSETS.image.arrow_rain_icon.key
    },
    'TRAP': {
        name: 'Trap',
        type: 'trap',
        range: 4,
        cost: 1,
        cooldown: 3,
        currentCooldown: 0,
        icon: ASSETS.image.trap_icon.key
    },
    'BASIC_HEAL': {
        name: 'Heal',
        type: 'basic_heal',
        range: 3,
        cost: 1,
        cooldown: 2,
        currentCooldown: 0,
        amount: 30,
        modifier: 1.0,
        icon: ASSETS.image.basic_heal_icon.key
    },
    'FIREBALL': {
        name: 'Fireball',
        type: 'fireball',
        range: 5,
        cost: 1,
        cooldown: 2,
        currentCooldown: 0,
        damage: 25,
        damageType: 'magical',
        modifier: 1.2,
        status: { type: 'burn', duration: 1, damage: 10 },
        icon: ASSETS.image.fireball_icon.key
    },
    'FREEZE_BALL': {
        name: 'Freeze Ball',
        type: 'freeze_ball',
        range: 5,
        cost: 1,
        cooldown: 2,
        currentCooldown: 0,
        damage: 15,
        damageType: 'magical',
        modifier: 0.9,
        status: { type: 'freeze', duration: 1 },
        icon: ASSETS.image.freeze_icon.key
    }
};
