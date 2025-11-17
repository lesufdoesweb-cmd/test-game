import { GameObject } from './GameObject.js';
import { Textbox } from '../ui/Textbox.js';

export class Obstacle extends GameObject {
    constructor(scene, config) {
        super(scene, config);
    }

    onClick() {
        const uiScene = this.scene.scene.get('ActionUI');
        if (uiScene.textbox) {
            return; // A textbox is already active
        }
        uiScene.textbox = new Textbox(uiScene, "It's a rock. It doesn't say much.", () => {
            uiScene.textbox = null;
        });
    }
}
