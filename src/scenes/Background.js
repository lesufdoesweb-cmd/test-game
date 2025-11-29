export class Background extends Phaser.Scene {
    constructor() {
        super('Background');
        this.gradientImage = null;
        this.isGameActive = false;
    }

    create() {
        const { width, height } = this.scale;

        const gradientTexture = this.textures.createCanvas('background_gradient', width, height);
        
        if (gradientTexture) {
            const context = gradientTexture.context;
            const grd = context.createLinearGradient(0, 0, 0, height);

            grd.addColorStop(0, '#416072');
            grd.addColorStop(0.35, '#487067');
            grd.addColorStop(0.6, '#578360');
            grd.addColorStop(0.8, '#a0c371');
            grd.addColorStop(1, '#cbe578');

            context.fillStyle = grd;
            context.fillRect(0, 0, width, height);

            gradientTexture.refresh();

            this.gradientImage = this.add.image(0, 0, 'background_gradient').setOrigin(0, 0).setScrollFactor(0);
        }
    }

    update() {
        const topSceneKey = this.scene.manager.getScenes(true).pop()?.scene.key;
        const gameIsOnTop = (topSceneKey === 'ActionUI');
        this.gradientImage.setVisible(false);
        // if (gameIsOnTop && !this.isGameActive) {
        //     this.isGameActive = true;
        //     if (this.gradientImage) this.gradientImage.setVisible(false);
        //     this.cameras.main.setBackgroundColor('#000000');
        // } else if (!gameIsOnTop && this.isGameActive) {
        //     this.isGameActive = false;
        //     if (this.gradientImage) this.gradientImage.setVisible(true);
        //     // The camera background will be covered by the gradient image,
        //     // so we don't need to make it transparent again.
        // }
    }
}