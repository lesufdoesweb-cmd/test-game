// gameObjects/unitTypes.js
import ASSETS from '../assets.js';

export const UNIT_TYPES = {
    'Archer': {
        name: 'Archer',
        isPlayer: true,
        textureKey: 'archer',
        stats: {
            maxHealth: 80,
            currentHealth: 80,
            moveRange: 5,
            physicalDamage: 30,
            speed: 12
        },
        moves: ['MOVE', 'LONG_ATTACK']
    },
    'Orc': {
        name: 'Orc',
        isPlayer: false,
        textureKey: 'ork',
        stats: {
            maxHealth: 100,
            currentHealth: 100,
            moveRange: 3,
            physicalDamage: 35,
            speed: 9
        },
        moves: ['MOVE', 'BASIC_ATTACK']
    },
    'Spider': {
        name: 'Spider',
        isPlayer: false,
        textureKey: 'spider',
        stats: {
            maxHealth: 60,
            currentHealth: 60,
            moveRange: 5,
            physicalDamage: 25,
            speed: 14
        },
        moves: ['MOVE', 'BASIC_ATTACK']
    },
    'Knight': {
        name: 'Knight',
        isPlayer: true,
        textureKey: 'knight',
        stats: {
            maxHealth: 150,
            currentHealth: 150,
            moveRange: 4,
            physicalDamage: 40,
            speed: 10
        },
        moves: ['MOVE', 'BASIC_ATTACK', 'ENHANCE_ARMOR']
    }
};
