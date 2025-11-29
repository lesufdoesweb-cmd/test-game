export class Options extends Phaser.Scene {
    constructor() {
        super('Options');
    }

    create() {
        const centreX = this.scale.width * 0.5;
        const centreY = this.scale.height * 0.5;

        this.add.bitmapText(centreX, centreY - 200, 'editundo_55', 'Options', 55).setOrigin(0.5);

        this.add.bitmapText(centreX, centreY - 50, 'editundo_55', 'Volume: 100%', 55).setOrigin(0.5).setScale(42 / 55);

        this.add.bitmapText(centreX, centreY + 50, 'editundo_55', 'Difficulty: Normal', 55).setOrigin(0.5).setScale(42 / 55);

        const backButton = this.add.bitmapText(centreX, centreY + 200, 'editundo_55', 'Back', 55).setOrigin(0.5).setInteractive().setScale(42 / 55);

        backButton.on('pointerover', () => {
            backButton.setTint(0xffff00);
        });

        backButton.on('pointerout', () => {
            backButton.clearTint();
        });

        backButton.on('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }
}
