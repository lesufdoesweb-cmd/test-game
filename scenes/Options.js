export class Options extends Phaser.Scene {
    constructor() {
        super('Options');
    }

    create() {
        const centreX = this.scale.width * 0.5;
        const centreY = this.scale.height * 0.5;

        this.add.text(centreX, centreY - 200, 'Options', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(centreX, centreY - 50, 'Volume: 100%', {
            fontFamily: 'Arial Black', fontSize: 42, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(centreX, centreY + 50, 'Difficulty: Normal', {
            fontFamily: 'Arial Black', fontSize: 42, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        const backButton = this.add.text(centreX, centreY + 200, 'Back', {
            fontFamily: 'Arial Black', fontSize: 42, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setInteractive();

        backButton.on('pointerover', () => {
            backButton.setStyle({ fill: '#ff0' });
        });

        backButton.on('pointerout', () => {
            backButton.setStyle({ fill: '#fff' });
        });

        backButton.on('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }
}
