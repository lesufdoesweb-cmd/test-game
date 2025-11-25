export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    createButton(y, text, onClick) {
        const { width } = this.scale;

        const container = this.add.container(width / 2, y);
        container.setScale(0.3);

        const background = this.add.image(0, 0, 'button_background');
        background.setScale(1);

        const label = this.add.bitmapText(0, 0, 'editundo_55', text, 55);
        label.setLetterSpacing(2);
        label.setOrigin(0.5);

        container.add([background, label]);
        container.setSize(background.width, background.height);
        container.setInteractive({ useHandCursor: true });

        // --- UPDATED: Green Glow FX ---
        // Color: 0x90EE90 (Matches your particles)
        // Strength: 0 (Start invisible)
        const glowFx = container.postFX.addGlow(0x90EE90, 0, 0, false, 0.1, 10);

        container.on('pointerdown', onClick);

        container.on('pointerover', () => {
            this.tweens.add({
                targets: container,
                y: y - 8,
                duration: 150,
                ease: 'Sine.easeOut'
            });

            // Fade glow IN
            this.tweens.add({
                targets: glowFx,
                outerStrength: 1.5, // 4.0 is a good brightness for green
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

            // Fade glow OUT
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


            // Add the background image first so it's behind everything else
            const bgImage = this.add.image(width / 2, height / 2, 'bg_main_screen');
            // Scale the image to fill the screen while maintaining aspect ratio
            const scaleX = width / bgImage.width;
            const scaleY = height / bgImage.height;
            const scale = Math.max(scaleX, scaleY);
            bgImage.setScale(scale);
    
            const titleImage = this.add.image(width / 2, height / 4, 'title_main_screen');
            titleImage.setScale(0.8);

            this.tweens.add({
                targets: titleImage,
                y: titleImage.y - 15,
                duration: 1800,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });

            // Add leaf particles for a better menu look
            this.add.particles(0, 0, 'pixel', {
                emitZone: { source: new Phaser.Geom.Rectangle(0, height * 0.4, width, height * 0.5) },
                lifespan: { min: 3000, max: 10000 },
                speedX: { min: -8, max: 8 },
                speedY: { min: -18, max: -30 },
                scale: { start: 2, end: 0 },
                alpha: { start: 0.8, end: 0 },
                tint: 0xcbe578,
                quantity: 1,
                frequency: 25,
                blendMode: 'ADD'
            });
    
            const buttonYStart = height / 2 + 50;
    
            this.createButton(buttonYStart, 'Start Game', () => {
                this.scene.start('Game');
            });
        }}