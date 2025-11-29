export class NewMainMenu extends Phaser.Scene {
    constructor() {
        super('NewMainMenu');
    }

    createButton(x, y, text, onClick, scale = 0.3) {
        const container = this.add.container(x, y);
        container.setScale(scale);
        container.setDepth(4);
        const background = this.add.image(0, 0, 'button_background');
        background.setScale(1);

        const label = this.add.bitmapText(0, 0, 'editundo_55', text, 55);
        label.setLetterSpacing(2);
        label.setOrigin(0.5);

        container.add([background, label]);
        container.setSize(background.width, background.height);
        container.setInteractive({ useHandCursor: true });

        const glowFx = container.postFX.addGlow(0xffffff, 0, 0, false, 0.1, 10);

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

    spawnCloud(texture, minHeight = 0.1, maxHeight = 0.8) {

        const minDuration = 200000; const maxDuration = 300000;
        const { width, height } = this.scale;

        const startX = Phaser.Math.Between(0, width);
        const startY = Phaser.Math.Between(height * minHeight, height * maxHeight);

        const cloud = this.add.image(startX, startY, texture)
            .setAlpha(0.6)
            .setBlendMode(Phaser.BlendModes.SCREEN)
            .setDepth(1)
            .setScale(3);

        const moveCloud = () => {
            // After completing a cycle, reset to the left side with a new random Y and new random duration
            cloud.setX(-cloud.displayWidth);
            cloud.setY(Phaser.Math.Between(height * minHeight, height * maxHeight));
            const duration = Phaser.Math.Between(minDuration, maxDuration);

            this.tweens.add({
                targets: cloud,
                x: width + cloud.displayWidth,
                duration: duration,
                ease: 'Linear',
                onComplete: moveCloud
            });
        };

        // Calculate duration for the initial move for a smooth start
        const initialDuration = Phaser.Math.Between(minDuration, maxDuration);
        const totalTravelDistance = width + 2 * cloud.displayWidth;
        const initialTravelDistance = (width + cloud.displayWidth) - startX;
        const proratedInitialDuration = (initialDuration * 3) * (initialTravelDistance / totalTravelDistance);

        this.tweens.add({
            targets: cloud,
            x: width + cloud.displayWidth,
            duration: proratedInitialDuration,
            ease: 'Linear',
            onComplete: moveCloud
        });
    }

    create() {
        const { width, height } = this.scale;

        // 1. Create Background
        const bgImage = this.add.image(width / 2, height / 2, 'main_menu_background');
        const scaleX = width / bgImage.width;
        const scaleY = height / bgImage.height;
        const scale = Math.max(scaleX, scaleY);
        bgImage.setScale(scale).setDepth(0); // Set depth

        // Spawn multiple clouds with varying properties
        this.spawnCloud('cloud_1',0.1, 0.4);
        this.spawnCloud('cloud_2', 0.1, 0.4);
        this.spawnCloud('cloud_3',  0.1, 0.4);
        this.spawnCloud('cloud_4',  0.1, 0.4);
        this.spawnCloud('cloud_1',  0.1, 0.4);
        this.spawnCloud('cloud_2',  0.1, 0.4);
        this.spawnCloud('cloud_3',  0.1, 0.4);
        this.spawnCloud('cloud_4', 0.1, 0.4);



        // Add the front layer image
        const frontImage = this.add.image(width / 2, (height / 2) + 5, 'main_menu_front');
        frontImage.setScale(scale).setDepth(2); // Set depth

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
        particles.setDepth(4);
        particles.postFX.addGlow(0xff8C00, 4, 0, false, 0.1, 24);


        this.add.particles(0, 0, 'pixel', {
            emitZone: {
                source: new Phaser.Geom.Rectangle(upgradesButton.x - 45, upgradesButton.y - 88, 40, 1),
                type: 'random'
            },
            lifespan: { min: 2000, max: 5000 },
            speedY: { min: -15, max: -35 },
            speedX: { min: -5, max: 5 },
            scale: { start: 5, end: 10 },
            alpha: { start: 0.4, end: 0 },
            tint: 0xDDDDDD,
            frequency: 25,
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
        });

        const startButton = this.add.image((width / 2) - 78, height / 2, 'start_button').setInteractive({ useHandCursor: true });
        startButton.setScale(3);
        startButton.setDepth(5);

// 1. Important: Add padding to the texture so the outline doesn't get cut off
// Since you are scaling by 3, we need a bit of extra space for the glow.
        startButton.preFX.setPadding(32);

        startButton.on('pointerover', () => {
            // 2. Add the White Glow (Outline)
            // 0xffffff is White. 4 is the strength (thickness).
            startButton.preFX.addGlow(0xffffff, 4);

            this.tweens.add({
                targets: startButton,
                y: startButton.y - 4,
                duration: 100,
                ease: 'Sine.easeOut'
            });
        });

        startButton.on('pointerout', () => {
            // 3. Remove the Glow
            startButton.preFX.clear();

            this.tweens.add({
                targets: startButton,
                y: height / 2,
                duration: 100,
                ease: 'Sine.easeIn'
            });
        });

        startButton.on('pointerdown', () => {
            this.registry.set('level', 1);
            this.registry.set('playerArmy', []);
            this.registry.set('shopRefreshes', 3);
            this.registry.set('isFirstTime', true);

            this.scene.start('SquadUpgrade');
        });
        // Removed the camera postFX line here
    }
}
