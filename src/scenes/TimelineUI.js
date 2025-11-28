import ASSETS from '../assets.js';

export class TimelineUI extends Phaser.Scene {
    constructor() {
        super('TimelineUI');
        this.portraits = [];
    }

    create({ turnOrder }) {
        this.portraits = [];
        this.turnOrder = turnOrder;
        this.gameScene = this.scene.get('Game');

        this.createPortraits();

        this.gameScene.events.on('turn_changed', this.updateTimeline, this);
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
        
        // Initial draw
        this.updateTimeline(0);
    }

    shutdown() {
        if (this.gameScene) {
            this.gameScene.events.off('turn_changed', this.updateTimeline, this);
        }
    }

    createPortraits() {
        const startY = 50;
        const stepY = 55;
        const displayCount = 8;
        const bgScale = 0.4;

        for (let i = 0; i < displayCount; i++) {
            const y = startY + i * stepY;
            const x = 50;
            const portraitBg = this.add.image(x, y, ASSETS.image.timeline_bg.key)
                .setScale(bgScale);

            // Use a placeholder texture that exists
            const portrait = this.add.sprite(x, y, ASSETS.image.archer.key);
            portrait.setScale(1);
            portrait.setVisible(false); // Hide until updated with actual unit data

            this.portraits.push({ bg: portraitBg, sprite: portrait });
        }
    }

    updateTimeline(turnIndex) {
        const displayCount = 8;
        for (let i = 0; i < displayCount; i++) {
            if (i >= this.portraits.length) continue;

            const orderIndex = (turnIndex + i) % this.turnOrder.length;
            const unit = this.turnOrder[orderIndex];

            const portrait = this.portraits[i];

            if (unit) {
                portrait.sprite.setTexture(unit.sprite.texture.key, unit.sprite.frame.name);
                portrait.sprite.setVisible(true);
            } else {
                portrait.sprite.setVisible(false); // Hide if no unit for this turn slot
            }

            if (i === 0) {
                portrait.bg.setTint(0xffd700);
            } else {
                portrait.bg.clearTint();
            }
        }
    }
}
