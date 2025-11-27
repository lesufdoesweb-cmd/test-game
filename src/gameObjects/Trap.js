// src/gameObjects/Trap.js
import ASSETS from '../assets.js';

export class Trap extends Phaser.GameObjects.Sprite {
    constructor(scene, { gridX, gridY }) {
        const screenX = scene.origin.x + (gridX - gridY) * scene.mapConsts.HALF_WIDTH;
        const screenY = scene.origin.y + (gridX + gridY) * scene.mapConsts.QUARTER_HEIGHT;

        super(scene, screenX, screenY - 7, ASSETS.image.bear_trap.key);
        scene.add.existing(this);

        this.gridPos = { x: gridX, y: gridY };
        this.setOrigin(0.5, 0.5); // Center the sprite
        this.setScale(0.5); // Reduce size
        this.setDepth(screenY - 1); // a bit behind the unit

        scene.tweens.add({
            targets: this,
            y: this.y - 3,
            duration: 500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    }

    trigger(unit) {
        // Play damage animation on the unit
        unit.takeDamage({ damage: 20, isCrit: false });

        // Destroy the trap
        this.destroy();
    }
}