export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    create() {
        const centreX = this.scale.width * 0.5;
        const centreY = this.scale.height * 0.5;

        this.add.text(centreX, centreY - 100, 'Main Menu', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        const startButton = this.add.text(centreX, centreY, 'Start Game', {
            fontFamily: 'Arial Black', fontSize: 42, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setInteractive();

        const optionsButton = this.add.text(centreX, centreY + 100, 'Options', {
            fontFamily: 'Arial Black', fontSize: 42, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setInteractive();

        const exitButton = this.add.text(centreX, centreY + 200, 'Exit', {
            fontFamily: 'Arial Black', fontSize: 42, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setInteractive();

        startButton.on('pointerover', () => {
            startButton.setStyle({ fill: '#ff0' });
        });

        startButton.on('pointerout', () => {
            startButton.setStyle({ fill: '#fff' });
        });

        startButton.on('pointerdown', () => {
            this.scene.start('Game');
        });

        optionsButton.on('pointerover', () => {
            optionsButton.setStyle({ fill: '#ff0' });
        });

        optionsButton.on('pointerout', () => {
            optionsButton.setStyle({ fill: '#fff' });
        });

        optionsButton.on('pointerdown', () => {
            this.scene.start('Options');
        });

        exitButton.on('pointerover', () => {
            exitButton.setStyle({ fill: '#ff0' });
        });

        exitButton.on('pointerout', () => {
            exitButton.setStyle({ fill: '#fff' });
        });

        exitButton.on('pointerdown', () => {
            // In a real game, you'd want to close the window.
            // For a browser game, this is not possible, so we'll just log it.
            console.log('Exit button clicked');
        });
    }
}
