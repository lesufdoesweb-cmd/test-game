export class NewMainMenu extends Phaser.Scene {
    constructor() {
        super('NewMainMenu');
    }

    createButton(x, y, text, onClick, scale = 0.3) {
        const container = this.add.container(x, y);
        container.setScale(scale);

        const background = this.add.image(0, 0, 'button_background');
        background.setScale(1);

        const label = this.add.bitmapText(0, 0, 'editundo_55', text, 55);
        label.setLetterSpacing(2);
        label.setOrigin(0.5);

        container.add([background, label]);
        container.setSize(background.width, background.height);
        container.setInteractive({ useHandCursor: true });

        const glowFx = container.postFX.addGlow(0x90EE90, 0, 0, false, 0.1, 10);

        container.on('pointerdown', onClick);

        container.on('pointerover', () => {
            this.tweens.add({
                targets: container,
                y: y - 8,
                duration: 150,
                ease: 'Sine.easeOut'
            });

            this.tweens.add({
                targets: glowFx,
                outerStrength: 1.5,
                duration: 150,
                ease: 'Sine.easeOut'
            });
        });

        container.on('pointerout', () => {
            this.tweens.add({
                targets: container,
                y: y,
                duration: 150,
                ease: 'Sine.easeIn'
            });

            this.tweens.add({
                targets: glowFx,
                outerStrength: 0,
                duration: 150,
                ease: 'Sine.easeIn'
            });
        });

        return container;
    }
    create() {
        const { width, height } = this.scale;

        // 1. Create Background
        const bgImage = this.add.image(width / 2, height / 2, 'main_menu_background');
        const scaleX = width / bgImage.width;
        const scaleY = height / bgImage.height;
        const scale = Math.max(scaleX, scaleY);
        bgImage.setScale(scale);

        // Add the front layer image
        const frontImage = this.add.image(width / 2, height / 2, 'main_menu_front');
        frontImage.setScale(scale);

        // --- FIX: Apply Vignette to the Background Image ONLY ---
        // This ensures the vignette is drawn "behind" the fire and UI.
        // x, y, radius, strength
        bgImage.postFX.addVignette(0.5, 0.5, 0.8, 0.4);

        const upgradesButton = this.createButton(width * 0.1, height / 2, 'Upgrades', () => {
            // Does nothing for now
        });

        // ... [Rest of your particle and fire code remains exactly the same] ...

        const particles = this.add.particles(0, 0, 'pixel', {
            emitZone: { source: new Phaser.Geom.Line(upgradesButton.x - 30, upgradesButton.y + 100, upgradesButton.x, upgradesButton.y + 100) },
            lifespan: { min: 2000, max: 2300 },
            speedY: { min: -10, max: -20 },
            scale: { start: 5, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0xffff00, 0xff8C00],
            quantity: 1,
            frequency: 50,
            blendMode: 'ADD'
        });
        particles.postFX.addGlow(0xff8C00, 4, 0, false, 0.1, 24);


        this.add.particles(0, 0, 'pixel', {
            emitZone: {
                source: new Phaser.Geom.Rectangle(upgradesButton.x - 45, upgradesButton.y - 88, 40, 1),
                type: 'random'
            },
            lifespan: { min: 2000, max: 5000 },
            speedY: { min: -15, max: -35 },
            speedX: { min: -5, max: 5 },
            scale: { start: 2, end: 5 },
            alpha: { start: 0.4, end: 0 },
            tint: 0xDDDDDD,
            frequency: 50,
            quantity: 1,
            blendMode: 'NORMAL'
        });

        if (!this.textures.exists('fire_beam_texture')) {
            const canvasTexture = this.textures.createCanvas('fire_beam_texture', 128, 128);
            const ctx = canvasTexture.context;
            const gradient = ctx.createLinearGradient(0, 0, 128, 0);
            gradient.addColorStop(0, 'rgba(255, 200, 0, 0)');
            gradient.addColorStop(0.4, 'rgba(255, 200, 0, 0.1)');
            gradient.addColorStop(1, 'rgba(255, 220, 150, 0.5)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(42, 50);
            ctx.lineTo(42, 83);
            ctx.lineTo(128, 85);
            ctx.lineTo(128, 58);
            ctx.closePath();
            ctx.fill();
            canvasTexture.refresh();
        }

        if (!this.textures.exists('fire_beam_texture_2')) {
            const canvasTexture = this.textures.createCanvas('fire_beam_texture_2', 128, 128);
            const ctx = canvasTexture.context;
            const gradient = ctx.createLinearGradient(0, 0, 128, 0);
            gradient.addColorStop(0, 'rgba(255, 200, 0, 0)');
            gradient.addColorStop(0.4, 'rgba(255, 200, 0, 0.1)');
            gradient.addColorStop(1, 'rgba(255, 220, 150, 0.7)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(44, 50);
            ctx.lineTo(44, 95);
            ctx.lineTo(128, 95);
            ctx.lineTo(128, 58);
            ctx.closePath();
            ctx.fill();
            canvasTexture.refresh();
        }

        const createFireBeam = (relX, relY, texture) => {
            const beamX = bgImage.x - (bgImage.displayWidth / 2) + (relX * bgImage.scaleX);
            const beamY = bgImage.y - (bgImage.displayHeight / 2) + (relY * bgImage.scaleY);

            const fireLight = this.add.image(beamX, beamY, texture);
            fireLight.setOrigin(1, 0.5);
            fireLight.setAngle(0);
            fireLight.setBlendMode(Phaser.BlendModes.ADD);
            fireLight.setDepth(100);
            fireLight.setTint(0xFFAA00);
            fireLight.setScale(60 / 128, 1);

            const glowFx = fireLight.postFX.addGlow(0xff8C00, 2, 0, false, 0.1, 24);

            const startFlicker = () => {
                const flickerDuration = Phaser.Math.Between(200, 500);
                this.tweens.add({
                    targets: fireLight,
                    alpha: Phaser.Math.FloatBetween(0.85, 0.85),
                    scaleX: Phaser.Math.FloatBetween(65, 65) / 128,
                    duration: flickerDuration,
                    ease: 'Sine.easeInOut',
                    onComplete: startFlicker
                });
                this.tweens.add({
                    targets: glowFx,
                    outerStrength: Phaser.Math.FloatBetween(2, 4),
                    duration: flickerDuration,
                    ease: 'Sine.easeInOut'
                });
            };

            startFlicker();
        };

        createFireBeam(255, 190, 'fire_beam_texture');
        createFireBeam(442, 100, 'fire_beam_texture_2');

        this.createButton(width - 80, 50, 'Options', () => {
        }, 0.2);

        // Removed the camera postFX line here
    }
}
