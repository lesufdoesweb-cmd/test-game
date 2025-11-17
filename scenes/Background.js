import ASSETS from '../assets.js';

export class Background extends Phaser.Scene {
    constructor() {
        super('Background');
    }

    create() {
        const { width, height } = this.scale;
        const bg = this.add.image(width / 2, height / 2, ASSETS.image.level_bg.key);
        
        // Scale the background to cover the entire game area
        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale).setScrollFactor(0);
    }
}
