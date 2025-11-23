// gameObjects/Projectile.js
export class Projectile extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, texture, target, onComplete) {
        super(scene, x, y, texture);
        scene.add.existing(this);

        this.target = target;
        this.onComplete = onComplete;
        this.speed = 0.4 ;// Speed in pixels per millisecond

        // Rotate projectile to face target
        this.rotation = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);

        const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        const duration = distance / this.speed;
        this.setScale(0.3);
        scene.tweens.add({
            targets: this,
            x: this.target.x,
            y: this.target.y - 24,
            duration: duration,
            ease: 'Linear',
            onComplete: () => {
                if (this.onComplete) {
                    this.onComplete();
                }
                this.destroy();
            }
        });
    }
}