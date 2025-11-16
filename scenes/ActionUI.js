export class ActionUI extends Phaser.Scene {
    constructor() {
        super('ActionUI');
        this.buttons = [];
    }

    create() {
        this.gameScene = this.scene.get('Game');

        this.gameScene.events.on('player_turn_started', (player) => this.showActions(player), this);
        this.gameScene.events.on('player_action_selected', this.hide, this);
        this.gameScene.events.on('player_turn_ended', this.hide, this);
        this.gameScene.events.on('action_cancelled', () => this.showActions(this.gameScene.player), this);
    }

    createButton(x, y, text, callback) {
        const button = this.add.text(x, y, text, {
            fontSize: '20px',
            backgroundColor: '#333',
            padding: { x: 10, y: 5 }
        })
            .setInteractive({ useHandCursor: true })
            .setScrollFactor(0)
            .setDepth(100000);

        button.on('pointerdown', callback);
        return button;
    }

    showActions(unit) {
        this.hide(); // Clear existing buttons
        let buttonX = 50;

        unit.moves.forEach(move => {
            const button = this.createButton(buttonX, 550, move.name, () => {
                this.gameScene.events.emit('action_selected', move);
            });
            this.buttons.push(button);
            buttonX += 100;
        });

        // Add Cancel button
        const cancelButton = this.createButton(buttonX, 550, 'Cancel', () => {
            this.gameScene.events.emit('action_cancelled');
        });
        this.buttons.push(cancelButton);
    }

    hide() {
        this.buttons.forEach(b => b.destroy());
        this.buttons = [];
    }
}
