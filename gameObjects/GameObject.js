export class GameObject {
    constructor(scene, { x, y, texture, frame, depth }) {
        this.scene = scene;
        this.sprite = scene.add.sprite(x, y, texture, frame).setOrigin(0.5, 1);
        this.sprite.setDepth(depth);
        this.sprite.setInteractive();
        this.sprite.on('pointerover', () => {
            this.scene.input.setDefaultCursor('pointer');
        });
        this.sprite.on('pointerout', () => {
            this.scene.input.setDefaultCursor('default');
        });
        this.sprite.on('pointerdown', (pointer) => {
            if (pointer.leftButtonDown()) {
                this.onClick();
                pointer.event.stopPropagation();
            }
        });
    }

    onClick() {
        // To be overridden by subclasses
    }

    onWalkOver() {
        // To be overridden by subclasses
    }

    onStandNear() {
        // To be overridden by subclasses
    }
    
    destroy() {
        this.sprite.destroy();
    }
}
