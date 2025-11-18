export class Tooltip {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
    }

    showAt(content, anchorX, anchorY) {
        if (this.container) {
            this.hide();
        }

        const textObject = this.scene.add.text(0, 0, content, {
            fontFamily: 'VT323',
            fontSize: '14px',
            fill: '#fff',
            wordWrap: { width: 150 }
        });

        const padding = 8;
        const textWidth = textObject.width;
        const textHeight = textObject.height;
        const tooltipWidth = textWidth + padding * 2;
        const tooltipHeight = textHeight + padding * 2;

        textObject.setPosition(padding, padding);

        const background = this.scene.add.graphics();
        background.fillStyle(0x111111, 0.9);
        background.fillRoundedRect(0, 0, tooltipWidth, tooltipHeight, 5);
        background.lineStyle(1, 0xeeeeee, 0.9);
        background.strokeRoundedRect(0, 0, tooltipWidth, tooltipHeight, 5);
        
        const sceneWidth = this.scene.scale.width;
        const sceneHeight = this.scene.scale.height;

        // --- FORCED POSITION FOR DEBUGGING ---
        let newX = sceneWidth / 2 - tooltipWidth / 2; // Center horizontally
        let newY = sceneHeight / 2 - tooltipHeight / 2; // Center vertically

        this.container = this.scene.add.container(newX, newY);
        this.container.add([background, textObject]);
        this.container.setDepth(30000);
        this.container.setScrollFactor(0);
    }

    hide() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }

    isVisible() {
        return !!this.container;
    }
}