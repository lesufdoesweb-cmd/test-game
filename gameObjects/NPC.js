import { GameObject } from './GameObject.js';

export class NPC extends GameObject {
    constructor(scene, config) {
        super(scene, config);
        this.npcType = config.npcType;
    }

    onClick() {
        // In the future, this could start a dialog.
        console.log(`NPC of type ${this.npcType} clicked.`);
    }
}
