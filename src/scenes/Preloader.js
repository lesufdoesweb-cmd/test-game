import ASSETS from '../assets.js';

export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload() {

        this.load.bitmapFont(
            'editundo_55',
            'src/assets/fonts/editundo.png',
            'src/assets/fonts/editundo.xml'
        );

        this.load.bitmapFont(
            'editundo_23',
            'src/assets/fonts/Unnamed.png',
            'src/assets/fonts/Unnamed.xml'
        );

                this.load.bitmapFont(

                    'editundo_18',

                    'src/assets/fonts/Unnamed_18.png',

                    'src/assets/fonts/Unnamed_18.xml'

                );

        

                // Load a simple pixel image for particles

                this.load.image('pixel', 'src/assets/user_interface/pixel.png');

                
        // Add a loading bar
        const { width, height } = this.scale;
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 30, 320, 50);

        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px monospace',
                fill: '#ffffff'
            }
        }).setOrigin(0.5, 0.5);

        const percentText = this.make.text({
            x: width / 2,
            y: height / 2 - 5,
            text: '0%',
            style: {
                font: '18px monospace',
                fill: '#ffffff'
            }
        }).setOrigin(0.5, 0.5);

        this.load.on('progress', (value) => {
            percentText.setText(parseInt(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 20, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });

        // Load easystar script
        this.load.script('easystar', 'src/lib/easystar.min.js');

        // Load all assets from assets.js
        for (const type in ASSETS) {
            for (const key in ASSETS[type]) {
                const value = ASSETS[type][key];
                this.load[type](value.key, ...value.args);
            }
        }
    }

    create() {
        this.scene.launch('Background');
        this.scene.start('NewMainMenu');
    }
}