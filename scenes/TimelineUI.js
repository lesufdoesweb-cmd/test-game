export class TimelineUI extends Phaser.Scene {
    constructor() {
        super('TimelineUI');
        this.portraits = [];
    }

    create({ turnOrder }) {
        this.turnOrder = turnOrder;
        this.gameScene = this.scene.get('Game');

        this.createPortraits();

        this.gameScene.events.on('turn_changed', this.updateTimeline, this);
        
        // Initial draw
        this.updateTimeline(0);
    }

    createPortraits() {
        const startY = 50;
        const stepY = 60;
        const displayCount = 5;

        for (let i = 0; i < displayCount; i++) {
            const y = startY + i * stepY;
            const portraitBg = this.add.graphics();
            portraitBg.fillStyle(0x000000, 0.5);
            portraitBg.fillRect(10, y - 25, 50, 50);

            // Use a placeholder texture that exists
            const portrait = this.add.sprite(35, y, 'basic_unit');
            portrait.setScale(1.5);

            this.portraits.push({ bg: portraitBg, sprite: portrait });
        }
    }

    updateTimeline(turnIndex) {
        const displayCount = 5;
        for (let i = 0; i < displayCount; i++) {
            if (i >= this.portraits.length) continue;

            const orderIndex = (turnIndex + i) % this.turnOrder.length;
            const unit = this.turnOrder[orderIndex];

            const portrait = this.portraits[i];
            portrait.sprite.setFrame(unit.sprite.frame.name);

            portrait.bg.clear();
            if (i === 0) {
                portrait.bg.lineStyle(2, 0xffff00);
                portrait.bg.strokeRect(10, portrait.sprite.y - 25, 50, 50);
            } else {
                portrait.bg.fillStyle(0x000000, 0.5);
                portrait.bg.fillRect(10, portrait.sprite.y - 25, 50, 50);
            }
        }
    }
}
