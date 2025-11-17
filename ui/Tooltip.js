export class Tooltip extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        scene.add.existing(this);

        this.background = scene.add.graphics();
        this.text = scene.add.text(8, 8, '', { // Position text with offset, remove style padding
            fontSize: '14px',
            fill: '#fff',
            wordWrap: { width: 150 }
        });

        this.add(this.background);
        this.add(this.text);

        this.setDepth(99999);
        this.setVisible(false);
    }

    showAt(content, anchorX, anchorY) {
        this.setVisible(true);
        this.text.setText(content);

        const padding = 8;
        const textWidth = this.text.width;
        const textHeight = this.text.height;
        const tooltipWidth = textWidth + padding * 2;
        const tooltipHeight = textHeight + padding * 2;

        this.background.clear();
        this.background.fillStyle(0x111111, 0.9);
        this.background.fillRoundedRect(0, 0, tooltipWidth, tooltipHeight, 5);
        this.background.lineStyle(1, 0xeeeeee, 0.9);
        this.background.strokeRoundedRect(0, 0, tooltipWidth, tooltipHeight, 5);

        // Position tooltip with its bottom-left corner at the anchor point
        let newX = anchorX;
        let newY = anchorY - tooltipHeight;

        // Adjust to keep it on screen
        const sceneWidth = this.scene.scale.width;
        const sceneHeight = this.scene.scale.height;

        if (newX + tooltipWidth > sceneWidth) {
            newX = sceneWidth - tooltipWidth;
        }
        if (newX < 0) {
            newX = 0;
        }
        if (newY < 0) {
            newY = 0;
        }
        if (newY + tooltipHeight > sceneHeight) {
            newY = sceneHeight - tooltipHeight;
        }

        this.setPosition(newX, newY);
    }

    hide() {
        this.setVisible(false);
    }
}
