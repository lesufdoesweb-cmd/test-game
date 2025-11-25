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
        icon: ASSETS.image.basic_attack_icon.key
    },
'ARROW_ATTACK': {
        name: 'Arrow Attack',
        type: 'arrow_attack',
        range: 4,
        cost: 1,
        cooldown: 1,
        currentCooldown: 0,
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
    }
};
