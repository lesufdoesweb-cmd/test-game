import ASSETS from '../assets.js';

export class RecruitUnitCard {
    constructor(scene, x, y, config) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.config = config;

        // State
        this.isLocked = config.isLocked || false;
        this.isSelected = false;

        // Scaling
        this.currentScale = 1.5;

        this.idleTween = null;
        this.hoverTween = null;

        // --- 1. The MAIN Outer Container ---
        this.cardContainer = scene.add.container(x, y);
        this.cardContainer.setDepth(10);

        // --- 2. The Inner Container (Holds Visuals) ---
        this.innerCardContainer = scene.add.container(0, 0);
        this.cardContainer.add(this.innerCardContainer);

        // FX
        this.innerCardContainer.postFX.setPadding(32);
        this.outlineFX = this.innerCardContainer.postFX.addGlow(0xffffff, 0, 0, false, 0.1, 24);

        // Setup Content
        this.setupCardVisuals(this.config.unit, this.config.rarity, this.config.stats, this.config.stars);

        // Setup Interaction
        this.width = this.components.bg.width;
        this.height = this.components.bg.height;
        this.cardContainer.setSize(this.width, this.height);
        this.cardContainer.setInteractive({ useHandCursor: true });

        this.setupInteractions();

        // Apply initial scale
        this.cardContainer.setScale(this.currentScale);

        if (this.isLocked) {
            this.addLockedOverlay();
        }
    }

    setupInteractions() {
        this.cardContainer.on('pointerover', () => {
            if (this.hoverTween) this.hoverTween.stop();
            this.hoverTween = this.scene.tweens.add({
                targets: this.cardContainer,
                y: this.y - 10,
                duration: 200,
                ease: 'Sine.out'
            });

            // Only glow if not selected, or enhance it
            if (!this.isSelected) {
                this.scene.tweens.add({
                    targets: this.outlineFX,
                    outerStrength: 2,
                    duration: 200
                });
            }
        });

        this.cardContainer.on('pointerout', () => {
            if (this.hoverTween) this.hoverTween.stop();
            this.hoverTween = this.scene.tweens.add({
                targets: this.cardContainer,
                y: this.y,
                duration: 200,
                ease: 'Sine.out'
            });

            if (!this.isSelected) {
                this.scene.tweens.add({
                    targets: this.outlineFX,
                    outerStrength: 0,
                    duration: 200
                });
            }
        });

        this.cardContainer.on('pointerdown', () => {
            // FIX: Removed the `if (this.isLocked) return;` check here.
            // We want to be able to select locked cards to see their unlock price.
            this.cardContainer.emit('cardSelected', this);
        });
    }

    select() {
        this.isSelected = true;
        this.outlineFX.color = this.isLocked ? 0xff0000 : 0x00ff00; // Red glow if locked, Green if unlocked
        this.outlineFX.outerStrength = 4;
    }

    deselect() {
        this.isSelected = false;
        this.outlineFX.outerStrength = 0;
    }

    setupCardVisuals(unit, rarity, stats, stars) {
        this.innerCardContainer.removeAll(true);

        const cardBackgrounds = {
            'common': ASSETS.image.unit_card_common.key,
            'rare': ASSETS.image.unit_card_rare.key,
            'epic': ASSETS.image.unit_card_epic.key,
            'legendary': ASSETS.image.unit_card_legendary.key,
        };
        const bgKey = cardBackgrounds[rarity];

        const bg = this.scene.add.image(0, 0, bgKey);
        this.innerCardContainer.add(bg);

        const sprite = this.scene.add.sprite(0, 19, unit.textureKey);
        sprite.setOrigin(0.5, 1);
        this.innerCardContainer.add(sprite);

        const starCount = stars || 1;
        for (let i = 0; i < starCount; i++) {
            const star = this.scene.add.image(0, -42, ASSETS.image.star.key).setScale(0.5);
            star.x = (i - (starCount-1)/2) * 20;
            this.innerCardContainer.add(star);
        }

        const hpText = this.scene.add.bitmapText(0, 25, 'editundo_55', `HP: ${stats.maxHealth}`, 28).setOrigin(0.5).setScale(0.25);
        const atkText = this.scene.add.bitmapText(0, 33, 'editundo_55', `ATK: ${stats.physicalDamage}`, 28).setOrigin(0.5).setScale(0.25);
        this.innerCardContainer.add([hpText, atkText]);

        if (stats.magicDamage > 0) {
            const matkText = this.scene.add.bitmapText(0, 42, 'editundo_55', `MATK: ${stats.magicDamage}`, 28).setOrigin(0.5).setScale(0.25);
            this.innerCardContainer.add(matkText);
        }

        this.components = { bg, sprite };
    }

    addLockedOverlay() {
        this.lockedOverlay = this.scene.add.graphics({ fillStyle: { color: 0x000000, alpha: 0.6 } });
        this.lockedOverlay.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        this.innerCardContainer.add(this.lockedOverlay);

        // Lock Icon or Text
        this.lockIcon = this.scene.add.image(0, -10, 'lock_icon').setScale(1); // Assuming you have a lock icon, or remove this
        if(!this.scene.textures.exists('lock_icon')) this.lockIcon.setVisible(false); // Fallback

        this.beerIcon = this.scene.add.image(0, 20, 'beer_icon').setScale(1.5);
        this.costText = this.scene.add.bitmapText(25, 20, 'editundo_23', '3', 24).setOrigin(0.5);

        this.innerCardContainer.add([this.lockIcon, this.beerIcon, this.costText]);
    }

    unlock() {
        this.isLocked = false;

        // Remove overlay elements
        if (this.lockedOverlay) this.lockedOverlay.destroy();
        if (this.beerIcon) this.beerIcon.destroy();
        if (this.costText) this.costText.destroy();
        if (this.lockIcon) this.lockIcon.destroy();

        // Update selection glow color to green
        if (this.isSelected) {
            this.outlineFX.color = 0x00ff00;
        }
    }

    destroy() {
        if(this.cardContainer) this.cardContainer.destroy();
    }
}