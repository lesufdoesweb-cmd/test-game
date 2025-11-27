import ASSETS from '../assets.js';
import { UNIT_TYPES } from '../gameObjects/unitTypes.js';
import { UnitCard } from '../ui/UnitCard.js';

export class SquadUpgrade extends Phaser.Scene {
    constructor() {
        super('SquadUpgrade');
        this.cards = [];
        this.isAnimating = false;
    }

    create() {
        this.createPlaceholderTextures();

        const { width, height } = this.scale;

        // Background
        const bgImage = this.add.image(width / 2, height / 2, ASSETS.image.bg_char_selection.key);
        bgImage.setScale(Math.max(width / bgImage.width, height / bgImage.height));
        bgImage.setDepth(0);

        const titleBg = this.add.image(width / 2, 50, ASSETS.image.button_background.key);
        titleBg.setScale(0.5);
        titleBg.setDepth(1);

        const title = this.add.bitmapText(width / 2, 50, 'editundo_55', 'SQUAD UPGRADES', 28);
        title.setOrigin(0.5);
        title.setDepth(2);

        this.refreshBtn = this.add.image(width / 2, height - 50, ASSETS.image.refresh_button.key)
            .setInteractive({ useHandCursor: true })
            .setDepth(10);

        this.tweens.add({
            targets: this.refreshBtn,
            scale: 1.05,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.refreshBtn.on('pointerdown', () => {
            if (this.isAnimating) return;
            this.handleRefresh();
        });

        this.generateCards(true);
    }

    createPlaceholderTextures() {
        // 1. Dust Particle
        if (!this.textures.exists('dust_particle')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillRect(0, 0, 8, 8);
            graphics.generateTexture('dust_particle', 8, 8);
        }

        // 2. Glow/Sparkle Particle
        if (!this.textures.exists('glow_particle')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillRect(0, 0, 10, 10);
            graphics.generateTexture('glow_particle', 10, 10);
        }
    }

    generateCards(isFirstSpawn = false) {
        const rarities = [
            { name: 'common', weight: 60 },
            { name: 'rare', weight: 20 },
            { name: 'epic', weight: 15 },
            { name: 'legendary', weight: 5 },
        ];
        const unitKeys = Object.keys(UNIT_TYPES);
        const startX = 200;
        const gap = 280;

        for (let i = 0; i < 3; i++) {
            const rarity = this.getRandomRarity(rarities);
            const randomUnitKey = unitKeys[Math.floor(Math.random() * unitKeys.length)];
            const unit = UNIT_TYPES[randomUnitKey];
            const stats = this.getBoostedStats(unit.stats, rarity);
            const newConfig = { unit, rarity, stats };

            if (isFirstSpawn) {
                const card = new UnitCard(this, startX + i * gap, 270, newConfig);
                this.cards.push(card);
            } else {
                this.time.delayedCall(i * 150, () => {
                    this.cards[i].refreshContent(newConfig);
                });
            }
        }
    }

    handleRefresh() {
        this.isAnimating = true;

        this.tweens.add({
            targets: this.refreshBtn,
            scale: 0.9,
            duration: 50,
            yoyo: true,
            onComplete: () => this.createButtonFlares()
        });

        this.generateCards(false);

        this.time.delayedCall(1500, () => {
            this.isAnimating = false;
        });
    }

    createButtonFlares() {
        const emitter = this.add.particles(this.refreshBtn.x, this.refreshBtn.y, 'glow_particle', {
            speed: { min: 150, max: 250 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 400,
            quantity: 20,
            emitting: false
        });
        emitter.setDepth(100);
        emitter.explode();
        this.time.delayedCall(500, () => emitter.destroy());
    }

    getRandomRarity(rarities) {
        const totalWeight = rarities.reduce((acc, rarity) => acc + rarity.weight, 0);
        let random = Math.random() * totalWeight;
        for (const rarity of rarities) {
            if (random < rarity.weight) return rarity.name;
            random -= rarity.weight;
        }
    }

    getBoostedStats(baseStats, rarity) {
        const boostedStats = { ...baseStats };
        let boost = 1;
        if (rarity === 'rare') boost = 1.2;
        else if (rarity === 'epic') boost = 1.2 * 1.35;
        else if (rarity === 'legendary') boost = 1.2 * 1.35 * 1.35;

        boostedStats.maxHealth = Math.round(boostedStats.maxHealth * boost);
        boostedStats.physicalDamage = Math.round(boostedStats.physicalDamage * boost);
        if (boostedStats.magicDamage) boostedStats.magicDamage = Math.round(boostedStats.magicDamage * boost);

        return boostedStats;
    }
}