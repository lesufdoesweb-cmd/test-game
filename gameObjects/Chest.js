import { GameObject } from './GameObject.js';

export class Chest extends GameObject {
    constructor(scene, config) {
        super(scene, config);
        this.items = config.items || [];
    }

    onClick() {
        // In the future, this could open the chest.
        console.log('Chest clicked. Contains:', this.items);
    }
}
