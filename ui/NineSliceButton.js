export class NineSliceButton {
    constructor(scene, x, y, width, height, text, onClick) {
        this.scene = scene;
        this.onClick = onClick;

        // Create the 9-slice button background
        this.background = scene.add.nineslice(
            x, y,
            width, height,
            'ui_button', // Key for the button texture
            [8, 8, 8, 8], // Corner dimensions [topLeft, topRight, bottomLeft, bottomRight]
            [8, 8, 8, 8]  // Top, bottom, left, right border sizes
        ).setInteractive({ useHandCursor: true });

        // Create the button text
        this.text = scene.add.text(x, y, text, {
            fontFamily: 'VT323',
            fontSize: '16px',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5, 0.5);

        // Add pointer events
        this.background.on('pointerdown', () => {
            this.background.setTint(0xcccccc);
            if (this.onClick) {
                this.onClick();
            }
        });

        this.background.on('pointerup', () => {
            this.background.clearTint();
        });

        this.background.on('pointerover', () => {
            this.background.setTint(0xeeeeee);
        });

        this.background.on('pointerout', () => {
            this.background.clearTint();
        });
    }

    // Method to destroy the button
    destroy() {
        this.background.destroy();
        this.text.destroy();
    }
}
