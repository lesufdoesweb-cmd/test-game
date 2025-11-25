// src/systems/AnimationManager.js
export class AnimationManager {
    constructor(scene) {
        this.scene = scene;
    }

    animateSceneEntry() {
        const waveSpeed = 60;
        let maxTileDelay = 0;

        this.scene.animTiles.forEach(tile => {
            const delay = tile.getData('gridSum') * waveSpeed;
            if (delay > maxTileDelay) maxTileDelay = delay;

            this.scene.tweens.add({
                targets: tile,
                y: tile.getData('finalY'),
                alpha: 1,
                duration: 600,
                delay: delay,
                ease: 'Back.easeOut'
            });
        });

        this.scene.time.delayedCall(maxTileDelay + 200, () => {
            this.scene.animObjects.forEach((obj) => {
                const randomDelay = Math.random() * 300;

                this.scene.tweens.add({
                    targets: obj,
                    y: obj.getData('finalY'),
                    alpha: 1,
                    duration: 800,
                    delay: randomDelay,
                    ease: 'Bounce.easeOut',
                    onComplete: () => {
                        obj.setData('originalY', obj.y);
                    }
                });
            });

            this.scene.time.delayedCall(1200, () => {
                this.scene.turnManager.start();
            });
        });
    }

    createDamageEffect(x, y, attacker, target) {
        let angleCfg = {min: 0, max: 360};

        if (attacker && target && attacker.gridPos && target.gridPos) {
            const dx = target.gridPos.x - attacker.gridPos.x;
            const dy = target.gridPos.y - attacker.gridPos.y;
            const splashAngle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
            angleCfg = {min: splashAngle - 25, max: splashAngle + 25};
        } else if (typeof attacker === 'number' && typeof target === 'number') {
            const dx = x - attacker;
            const dy = y - target;
            const angleDeg = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
            const splashAngle = angleDeg + 180;
            angleCfg = {min: splashAngle - 25, max: splashAngle + 25};
        }

        const emitter = this.scene.add.particles(x, y, 'particle', {
            angle: angleCfg,
            speed: {min: 150, max: 300},
            scale: {start: 4, end: 0},
            lifespan: 500,
            gravityY: 400,
            alpha: {start: 1, end: 0},
            tint: 0xff0000,
            emitting: false
        });

        emitter.setDepth(99999999);
        if (emitter && emitter.explode) {
            emitter.explode(30);
        }

        this.scene.time.delayedCall(700, () => {
            try {
                emitter.stop();
            } catch (e) {
            }
            if (emitter && emitter.destroy) emitter.destroy();
        });

        this.scene.cameras.main.shake(120, 0.0005);
    }
}
