export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    createButton(y, text, onClick) {
        const { width } = this.scale;

        const container = this.add.container(width / 2, y);
        const background = this.add.image(0, 0, 'button_background');
        background.setScale(0.8)
        const label = this.add.text(0, -10, text, {
            fontSize: '55px',
            fill: '#ffffff',
            fontFamily: 'Pixelify-Sans'
        }).setOrigin(0.5);

        container.add([background, label]);
        container.setSize(background.width, background.height);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerdown', onClick);

        container.on('pointerover', () => {
            this.tweens.add({
                targets: container,
                y: y - 8,
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
            titleImage.setScale(1.5);

            this.tweens.add({
                targets: titleImage,
                y: titleImage.y - 15,
                duration: 1800,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });
    
            const buttonYStart = height / 2 + 50;
    
            this.createButton(buttonYStart, 'Start Game', () => {
                this.scene.start('Game');
            });
        }}