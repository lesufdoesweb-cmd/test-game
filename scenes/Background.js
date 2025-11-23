export class Background extends Phaser.Scene {
    constructor() {
        super('Background');
    }

    create() {
        const { width, height } = this.scale;

        const gradientTexture = this.textures.createCanvas('background_gradient', width, height);
        const context = gradientTexture.getContext();
        const grd = context.createLinearGradient(0, 0, 0, height);

        grd.addColorStop(0, '#416072');
        grd.addColorStop(0.35, '#487067');
        grd.addColorStop(0.6, '#578360');
        grd.addColorStop(0.8, '#a0c371');
        grd.addColorStop(1, '#cbe578');

        context.fillStyle = grd;
        context.fillRect(0, 0, width, height);

        //  Call this if running under WebGL, or you'll see a black texture
        gradientTexture.refresh();

        this.add.image(0, 0, 'background_gradient').setOrigin(0, 0).setScrollFactor(0);
    }
}
