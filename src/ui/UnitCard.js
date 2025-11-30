import ASSETS from '../assets.js';

export class UnitCard {
    constructor(scene, x, y, config) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.config = config;

        // State
        this.originalX = x;
        this.originalY = y;
        this.isShopCard = config.isShopCard || false;

        // Scaling - default to Shop/Normal size, allows dynamic resizing
        this.currentScale = 1.5;

        this.rarityEmitter = null;
        this.idleTween = null;
        this.hoverTween = null;
        this.isAnimating = false;

        // --- 1. The MAIN Outer Container ---
        this.cardContainer = scene.add.container(x, y);
        this.cardContainer.setDepth(10);

        // Shadow (Outside inner container to avoid outline FX)
        this.shadow = scene.add.image(10, 10, ASSETS.image.unit_card_common.key);
        this.shadow.setTint(0x000000);
        this.shadow.setAlpha(0.5);
        this.cardContainer.add(this.shadow);

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
        this.cardContainer.setInteractive();

        this.setupInteractions();

        // Apply initial scale
        this.cardContainer.setScale(this.isShopCard ? 1.5 : 0); // Shop cards start big, others might animate in
    }

    /**
     * Set the scale of the card (e.g., 1.5 for Army, 0.8 for Stash)
     */
    setCardScale(scale) {
        this.currentScale = scale;
        this.cardContainer.setScale(scale);
    }

    /**
     * Updates the logical and visual position of the card.
     * Crucial for ensuring hover animations return to the correct spot after a move.
     */
    updatePosition(x, y) {
        this.x = x;
        this.y = y;
        this.cardContainer.x = x;
        this.cardContainer.y = y;

        // Also update original positions so drag reverts go to the new home
        this.originalX = x;
        this.originalY = y;
    }

    setupInteractions() {
        this.cardContainer.on('pointerover', () => {
            if (this.isAnimating) return;
            if (this.idleTween) this.idleTween.pause();

            if (this.hoverTween) this.hoverTween.stop();
            this.hoverTween = this.scene.tweens.add({
                targets: this.cardContainer,
                y: this.cardContainer.y - 10, // Relative nudge
                duration: 200,
                ease: 'Sine.out'
            });

            // White Outline
            this.scene.tweens.add({
                targets: this.outlineFX,
                outerStrength: 4,
                duration: 200
            });
        });

        this.cardContainer.on('pointerout', () => {
            if (this.isAnimating) return;

            if (this.hoverTween) this.hoverTween.stop();
            this.hoverTween = this.scene.tweens.add({
                targets: this.cardContainer,
                y: this.y, // Return to base Y (NOTE: This assumes 'y' property is updated on drop)
                duration: 200,
                ease: 'Sine.out',
                onComplete: () => {
                    if (this.idleTween && !this.isAnimating) this.idleTween.resume();
                }
            });

            this.scene.tweens.add({
                targets: this.outlineFX,
                outerStrength: 0,
                duration: 200
            });
        });

        this.scene.input.setDraggable(this.cardContainer);

        this.cardContainer.on('dragstart', (pointer, dragX, dragY) => {
            this.scene.children.bringToTop(this.cardContainer);
            this.cardContainer.setScale(this.currentScale * 1.1); // Slight grow relative to current size

            if (this.components.bg) this.components.bg.setTint(0x999999);
            if (this.components.sprite) this.components.sprite.setTint(0x999999);

            this.originalDepth = this.cardContainer.depth;
            this.cardContainer.setDepth(999);

            // Important: We don't update this.y here, we use originalY for reverts
        });

        this.cardContainer.on('drag', (pointer, dragX, dragY) => {
            this.cardContainer.x = dragX;
            this.cardContainer.y = dragY;
        });

        this.cardContainer.on('dragend', (pointer, dragX, dragY, dropped) => {
            this.cardContainer.setScale(this.currentScale); // Reset to zone scale

            if (this.components.bg) this.components.bg.clearTint();
            if (this.components.sprite) this.components.sprite.clearTint();
            this.cardContainer.setDepth(this.originalDepth);

            // Logic handled by Scene 'drop' event. If not dropped, scene calls revert.
        });
    }

    startIdleAnimation() {
        if (this.idleTween) this.idleTween.destroy();
        this.idleTween = this.scene.tweens.add({
            targets: this.cardContainer,
            y: '+=3', // Relative movement
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });
    }

    stopIdleAnimation() {
        if (this.idleTween) this.idleTween.stop();
        this.cardContainer.y = this.y; // Snap to grid Y
    }

    setupCardVisuals(unit, rarity, stats, stars) {
        this.innerCardContainer.removeAll(true);
        this.clearRarityParticles();

        const cardBackgrounds = {
            'common': ASSETS.image.unit_card_common.key,
            'rare': ASSETS.image.unit_card_rare.key,
            'epic': ASSETS.image.unit_card_epic.key,
            'legendary': ASSETS.image.unit_card_legendary.key,
        };
        const bgKey = cardBackgrounds[rarity];

        // Background
        const bg = this.scene.add.image(0, 0, bgKey);
        this.innerCardContainer.add(bg);

        // Update Shadow to match shape
        if (this.shadow) this.shadow.setTexture(bgKey);

        // --- Rarity Effects ---
        if (rarity === 'epic') {
            if (bg.preFX) bg.preFX.addGlow(0xaa00ff, 4, 0, false, 0.1, 32);
            this.createRarityParticles(0xaa00ff);
        }
        else if (rarity === 'legendary') {
            if (bg.preFX) bg.preFX.addGlow(0xffd700, 6, 0, false, 0.1, 32);
            this.createRarityParticles(0xffd700);
        }

        // Sprite
        const sprite = this.scene.add.sprite(0, 19, unit.textureKey);
        sprite.setOrigin(0.5, 1);
        this.innerCardContainer.add(sprite);

        // Stars
        const starCount = stars || 1;
        const starSpacing = 15;
        const startX = -starSpacing * (starCount - 1) * 0.5; // Center stars

        for (let i = 0; i < starCount; i++) {
            // Only draw filled stars for simplicity, or keep empty if desired
            // Keeping it simple to prevent clutter
            const star = this.scene.add.image(0, -42, ASSETS.image.star.key).setScale(0.5);
            star.x = (i - (starCount-1)/2) * 20; // Centered logic
            this.innerCardContainer.add(star);
        }

        // Text
        const hpText = this.scene.add.bitmapText(0, 25, 'editundo_55', `HP: ${stats.maxHealth}`, 28).setOrigin(0.5).setScale(0.25);
        const atkText = this.scene.add.bitmapText(0, 33, 'editundo_55', `ATK: ${stats.physicalDamage}`, 28).setOrigin(0.5).setScale(0.25);
        this.innerCardContainer.add([hpText, atkText]);

        let matkText = null;
        if (stats.magicDamage > 0) {
            matkText = this.scene.add.bitmapText(0, 42, 'editundo_55', `MATK: ${stats.magicDamage}`, 28).setOrigin(0.5).setScale(0.25);
            this.innerCardContainer.add(matkText);
        }

        this.components = { bg, sprite, hpText, atkText, matkText };
    }

    createRarityParticles(tint) {
        const w = 100; // approx width
        const h = 150;
        const spawnZone = new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h);

        this.rarityEmitter = this.scene.add.particles(0, 0, 'dust_particle', {
            speed: { min: 20, max: 50 },
            angle: { min: 0, max: 360 },
            gravityY: -10, // Float up slightly
            lifespan: 1000,
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.5, end: 0 },
            tint: tint,
            blendMode: 'ADD',
            emitZone: { type: 'random', source: spawnZone },
            frequency: 100,
            quantity: 1,
        });

        this.innerCardContainer.add(this.rarityEmitter);
        this.innerCardContainer.sendToBack(this.rarityEmitter);
    }

    clearRarityParticles() {
        if (this.rarityEmitter) {
            this.rarityEmitter.destroy();
            this.rarityEmitter = null;
        }
    }

    playSpawnAnimation() {
        this.isAnimating = true;
        this.cardContainer.setScale(0);
        this.scene.tweens.add({
            targets: this.cardContainer,
            scale: this.currentScale, // UPDATED: Use currentScale instead of hardcoded 1.5
            duration: 400,
            ease: 'Back.out',
            onComplete: () => {
                this.isAnimating = false;
                this.startIdleAnimation();
            }
        });
    }

    destroy() {
        if(this.cardContainer) this.cardContainer.destroy();
        this.clearRarityParticles();
    }
}