export class Scenery {
    constructor(scene, { x, y, texture, frame, depth, gridPos }) {
        this.scene = scene;
        this.gridPos = gridPos;
        this.sprite = scene.add.sprite(x, y, texture, frame).setOrigin(0.5, 1);
        this.sprite.setDepth(depth);
    }

    destroy() {
        this.sprite.destroy();
    }
}
