export class GameOver extends Phaser.Scene {
    constructor() {
        super('GameOver');
    }

    create() {
        this.background1 = this.add.image(0, 0, 'background').setOrigin(0);

        this.add.bitmapText(this.scale.width * 0.5, this.scale.height * 0.5, 'editundo_55', 'Game Over', 55).setOrigin(0.5);

    }
}
