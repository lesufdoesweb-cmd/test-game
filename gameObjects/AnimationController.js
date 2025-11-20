export default class AnimationController {
    constructor(scene, sprite) {
        this.scene = scene;
        this.sprite = sprite;
        this.tweens = {};
    }

    playIdleAnimation() {
        if (this.tweens.idle) {
            this.tweens.idle.stop();
        }
        this.tweens.idle = this.scene.tweens.add({
            targets: this.sprite,
            y: this.sprite.y - 2,
            duration: 500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    }

    playMoveAnimation(path, onComplete) {
        if (this.tweens.move) {
            this.tweens.move.stop();
        }

        let i = 0;

        const playNextTween = () => {
            if (i >= path.length) {
                if (onComplete) {
                    onComplete();
                }
                return;
            }

            const ex = path[i].x;
            const ey = path[i].y;
            const currentScreenX = this.sprite.x;

            let newFlipX = this.sprite.flipX;

            if (ex < currentScreenX - 5 && !this.sprite.flipX) {
                newFlipX = true;
            } else if (ex > currentScreenX + 5 && this.sprite.flipX) {
                newFlipX = false;
            }

            const needsDirectionChange = newFlipX !== this.sprite.flipX;

            const startMovement = () => {
                i++;
                this.tweens.move = this.scene.tweens.add({
                    targets: this.sprite,
                    x: ex,
                    y: ey,
                    duration: 200,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        playNextTween();
                    }
                });
            };

            if (needsDirectionChange) {
                this.scene.tweens.add({
                    targets: this.sprite,
                    scaleX: 0,
                    duration: 100,
                    ease: 'Linear',
                    onComplete: () => {
                        this.sprite.flipX = newFlipX;
                        this.scene.tweens.add({
                            targets: this.sprite,
                            scaleX: 1.5,
                            duration: 100,
                            ease: 'Linear',
                            onComplete: () => {
                                startMovement();
                            }
                        });
                    }
                });
            } else {
                startMovement();
            }
        };

        playNextTween();
    }

    playHopAnimation() {
        if (this.tweens.hop) {
            this.tweens.hop.remove();
        }
        this.tweens.hop = this.scene.tweens.add({
            targets: this.sprite,
            y: this.sprite.y - 20,
            duration: 100,
            ease: 'Sine.easeInOut',
            yoyo: true
        });
    }

    playAttackAnimation(target, onComplete) {
        if (this.tweens.attack) {
            this.tweens.attack.stop();
        }

        const originalX = this.sprite.x;
        const originalY = this.sprite.y;

        const dx = target.sprite.x - this.sprite.x;
        const dy = target.sprite.y - this.sprite.y;
        const angle = Math.atan2(dy, dx);

        const backX = this.sprite.x - Math.cos(angle) * 10;
        const backY = this.sprite.y - Math.sin(angle) * 10;

        const forwardX = this.sprite.x + Math.cos(angle) * 20;
        const forwardY = this.sprite.y + Math.sin(angle) * 20;

        this.tweens.attack = this.scene.tweens.chain({
            tweens: [
                {
                    targets: this.sprite,
                    x: backX,
                    y: backY,
                    duration: 100,
                    ease: 'Sine.easeOut'
                },
                {
                    targets: this.sprite,
                    x: forwardX,
                    y: forwardY,
                    duration: 100,
                    ease: 'Sine.easeIn'
                },
                {
                    targets: this.sprite,
                    x: originalX,
                    y: originalY,
                    duration: 100,
                    ease: 'Sine.easeOut'
                }
            ],
            onComplete: () => {
                if (onComplete) {
                    onComplete();
                }
            }
        });
    }

    playCastAnimation(onComplete) {
        if (this.tweens.cast) {
            this.tweens.cast.stop();
        }

        const originalY = this.sprite.y;

        this.tweens.cast = this.scene.tweens.chain({
            tweens: [
                {
                    targets: this.sprite,
                    y: originalY - 20,
                    duration: 200,
                    ease: 'Sine.easeOut'
                },
                {
                    targets: this.sprite,
                    angle: 360,
                    duration: 300,
                    ease: 'Linear'
                },
                {
                    targets: this.sprite,
                    y: originalY,
                    duration: 200,
                    ease: 'Sine.easeIn'
                }
            ],
            onComplete: () => {
                this.sprite.angle = 0; // Reset angle
                if (onComplete) {
                    onComplete();
                }
            }
        });
    }

    stopAllAnimations() {
        for (const key in this.tweens) {
            if (this.tweens[key]) {
                this.tweens[key].stop();
            }
        }
        this.tweens = {};
    }
}
