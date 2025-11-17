export class Textbox {
    constructor(scene, text, onclose) {
        this.scene = scene;
        this.text = text;
        this.onclose = onclose;

        this.isTyping = false;
        this.isFinished = false;

        const { width, height } = scene.scale;
        const barY = scene.scale.height - 16 * 3 - 5; // Position above action bar
        const boxHeight = 100;

        this.container = scene.add.container(width / 2, barY - boxHeight / 2 - 10);
        this.container.setDepth(20000);

        const bg = scene.add.graphics();
        bg.fillStyle(0x111111, 0.8);
        bg.lineStyle(2, 0x888888, 1);
        bg.fillRoundedRect(-width / 2 + 20, -boxHeight / 2, width - 40, boxHeight, 16);
        bg.strokeRoundedRect(-width / 2 + 20, -boxHeight / 2, width - 40, boxHeight, 16);

        this.textObject = scene.add.text(-width / 2 + 40, -boxHeight / 2 + 10, '', {
            fontSize: '18px',
            fill: '#ffffff',
            wordWrap: { width: width - 80 }
        });

        this.container.add([bg, this.textObject]);

        this.container.setInteractive(new Phaser.Geom.Rectangle(-width/2, -boxHeight/2, width, boxHeight), Phaser.Geom.Rectangle.Contains);
        this.container.on('pointerdown', this.handleClick, this);

        this.startTyping();
    }

    startTyping() {
        this.isTyping = true;
        let i = 0;
        this.typingEvent = this.scene.time.addEvent({
            delay: 50,
            callback: () => {
                this.textObject.text += this.text[i];
                i++;
                if (i === this.text.length) {
                    this.isTyping = false;
                    this.isFinished = true;
                    this.typingEvent.destroy();
                }
            },
            loop: true
        });
    }

    handleClick() {
        if (this.isTyping) {
            // Speed up and show full text
            this.typingEvent.destroy();
            this.textObject.text = this.text;
            this.isTyping = false;
            this.isFinished = true;
        } else if (this.isFinished) {
            // Destroy the textbox
            this.destroy();
        }
    }

    destroy() {
        this.container.destroy();
        if (this.typingEvent) {
            this.typingEvent.destroy();
        }
        if (this.onclose) {
            this.onclose();
        }
    }
}
