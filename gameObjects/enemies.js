// gameObjects/enemies.js
import ASSETS from '../assets.js';

export const ENEMY_TYPES = {
    'Orc': {
        name: 'Orc',
        textureKey: 'ork',
        stats: {
            maxHealth: 100,
            currentHealth: 100,
            moveRange: 3,
            physicalDamage: 35,
            speed: 9
        },
        moves: [
            { name: 'Move', type: 'move', range: 3, cost: 0, cooldown: 1, currentCooldown: 0, icon: ASSETS.image.move_icon.key },
            { name: 'Attack', type: 'attack', range: 1, cost: 1, cooldown: 1, currentCooldown: 0, icon: ASSETS.image.basic_attack_icon.key }
        ]
    },
    // Future enemies can be added here
    // 'Goblin': { ... }
};