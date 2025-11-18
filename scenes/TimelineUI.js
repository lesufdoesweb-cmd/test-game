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
        const startY = 100;
        const stepY = 120;
        const displayCount = 5;

        for (let i = 0; i < displayCount; i++) {
            const y = startY + i * stepY;
            const portraitBg = this.add.graphics();
            portraitBg.fillStyle(0x000000, 0.5);
            portraitBg.fillRect(20, y - 50, 100, 100);

            // Use a placeholder texture that exists
            const portrait = this.add.sprite(70, y, 'basic_unit');
            portrait.setScale(3);

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
                portrait.bg.lineStyle(4, 0xffff00);
                portrait.bg.strokeRect(20, portrait.sprite.y - 50, 100, 100);
            } else {
                portrait.bg.fillStyle(0x000000, 0.5);
                portrait.bg.fillRect(20, portrait.sprite.y - 50, 100, 100);
            }
        }
    }
}
