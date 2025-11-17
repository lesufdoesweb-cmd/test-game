export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    create() {
        const { width, height } = this.scale;

        this.add.text(width / 2, height / 4, 'One More Run', {
            fontSize: '48px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Start Game Button
        const startGameButton = this.add.text(width / 2, height / 2, 'Start Game', {
            fontSize: '32px',
            fill: '#0f0'
        })
        .setOrigin(0.5)
        .setInteractive();

        startGameButton.on('pointerdown', () => {
            this.scene.start('LevelSelector');
        });
        startGameButton.on('pointerover', () => startGameButton.setStyle({ fill: '#ff0'}));
        startGameButton.on('pointerout', () => startGameButton.setStyle({ fill: '#0f0'}));


        // Level Selector Button
        const levelSelectorButton = this.add.text(width / 2, height / 2 + 70, 'Level Selector', {
            fontSize: '32px',
            fill: '#0f0'
        })
        .setOrigin(0.5)
        .setInteractive();

        levelSelectorButton.on('pointerdown', () => {
            this.scene.start('LevelSelector');
        });
        levelSelectorButton.on('pointerover', () => levelSelectorButton.setStyle({ fill: '#ff0'}));
        levelSelectorButton.on('pointerout', () => levelSelectorButton.setStyle({ fill: '#0f0'}));


        // Level Editor Button
        const levelEditorButton = this.add.text(width / 2, height / 2 + 140, 'Level Editor', {
            fontSize: '32px',
            fill: '#0f0'
        })
        .setOrigin(0.5)
        .setInteractive();

        levelEditorButton.on('pointerdown', () => {
            this.scene.start('LevelEditor');
        });
        levelEditorButton.on('pointerover', () => levelEditorButton.setStyle({ fill: '#ff0'}));
        levelEditorButton.on('pointerout', () => levelEditorButton.setStyle({ fill: '#0f0'}));
    }
}