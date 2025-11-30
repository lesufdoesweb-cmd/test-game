import ASSETS from '../assets.js';

export class UnitCard {
    constructor(scene, x, y, config) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.config = config; // Store the whole config
        this.originalX = x; // Store initial position for drag reset
        this.originalY = y; // Store initial position for drag reset
        this.isShopCard = config.isShopCard || false; // New property to identify shop cards

        this.rarityEmitter = null;
        this.idleTween = null;
        this.hoverTween = null;
        this.isAnimating = false;

        // --- 1. The MAIN Outer Container ---
        // Holds everything, handles movement and scaling.
        this.cardContainer = scene.add.container(x, y);
        this.cardContainer.setDepth(10);
        this.cardContainer.setScale(1.5);

        // Shadow goes into Outer container so it DOESN'T get the outline FX
        this.shadow = scene.add.image(10, 10, ASSETS.image.unit_card_common.key);
        this.shadow.setTint(0x000000);
        this.shadow.setAlpha(0.5);
        this.cardContainer.add(this.shadow);

        // --- 2. The Inner Container ---
        // Holds the actual card visual parts. The FX is applied here.
        this.innerCardContainer = scene.add.container(0, 0);
        this.cardContainer.add(this.innerCardContainer);

        // --- SETUP HOVER GLOW/OUTLINE ---
        // We use addGlow, but we set Quality to 0.1 to make it look harder (like an outline)
        // addGlow(color, outerStrength, innerStrength, knockout, quality, distance)
        this.innerCardContainer.postFX.setPadding(32);
        this.outlineFX = this.innerCardContainer.postFX.addGlow(0xffffff, 0, 0, false, 0.1, 24);

        // Setup Visuals (populates innerCardContainer)
        this.setupCardVisuals(this.config.unit, this.config.rarity, this.config.stats, this.config.stars);

        // Setup Interaction on the outer container
        this.cardContainer.setSize(this.width, this.height);
        this.cardContainer.setInteractive();
        this.setupInteractions();

        // Initial Spawn
        this.cardContainer.setScale(0);
    }

    setupInteractions() {
        this.cardContainer.on('pointerover', () => {
            if (this.isAnimating) return;

            if (this.idleTween) this.idleTween.pause();

            // Lift Card
            if (this.hoverTween) this.hoverTween.stop();
            this.hoverTween = this.scene.tweens.add({
                targets: this.cardContainer,
                y: this.y - 20,
                duration: 200,
                ease: 'Sine.out'
            });

            // Fade in White Outline
            this.scene.tweens.add({
                targets: this.outlineFX,
                outerStrength: 4, // Strength > 0 makes it visible
                duration: 200
            });
        });

        this.cardContainer.on('pointerout', () => {
            if (this.isAnimating) return;

            // Lower Card
            if (this.hoverTween) this.hoverTween.stop();
            this.hoverTween = this.scene.tweens.add({
                targets: this.cardContainer,
                y: this.y,
                duration: 200,
                ease: 'Sine.out',
                onComplete: () => {
                    if (this.idleTween && !this.isAnimating) this.idleTween.resume();
                }
            });

            // Fade out White Outline
            this.scene.tweens.add({
                targets: this.outlineFX,
                outerStrength: 0,
                duration: 200
            });
        });

        this.scene.input.setDraggable(this.cardContainer);

        this.cardContainer.on('dragstart', (pointer, dragX, dragY) => {
            this.scene.children.bringToTop(this.cardContainer);
            this.cardContainer.setScale(1.65); // Slightly larger when dragging
            if (this.components.bg) this.components.bg.setTint(0x999999);
            if (this.components.sprite) this.components.sprite.setTint(0x999999);
            this.originalDepth = this.cardContainer.depth; // Store original depth
            this.cardContainer.setDepth(999); // Bring to top

            // Store the initial position
            this.originalX = this.cardContainer.x;
            this.originalY = this.cardContainer.y;
        });

        this.cardContainer.on('drag', (pointer, dragX, dragY) => {
            this.cardContainer.x = dragX;
            this.cardContainer.y = dragY;
        });

        this.cardContainer.on('dragend', (pointer, dragX, dragY, dropped) => {
            this.cardContainer.setScale(1.5); // Reset scale
            if (this.components.bg) this.components.bg.clearTint();
            if (this.components.sprite) this.components.sprite.clearTint();
            this.cardContainer.setDepth(this.originalDepth); // Restore original depth

            if (!dropped) {
                // If not dropped on a valid target, return to original position
                this.scene.tweens.add({
                    targets: this.cardContainer,
                    x: this.originalX,
                    y: this.originalY,
                    duration: 200,
                    ease: 'Sine.easeOut'
                });
            }
        });
    }

    startIdleAnimation() {
        if (this.idleTween) this.idleTween.destroy();
        this.idleTween = this.scene.tweens.add({
            targets: this.cardContainer,
            y: this.y - 3,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });
    }

    stopIdleAnimation() {
        if (this.idleTween) {
            this.idleTween.stop();
            this.cardContainer.y = this.y;
        }
    }

    setupCardVisuals(unit, rarity, stats, stars) {
        // Clean inner container ONLY.
        this.innerCardContainer.removeAll(true);

        // Clear old particles (using the new method name)
        this.clearRarityParticles();

        const cardBackgrounds = {
            'common': ASSETS.image.unit_card_common.key,
            'rare': ASSETS.image.unit_card_rare.key,
            'epic': ASSETS.image.unit_card_epic.key,
            'legendary': ASSETS.image.unit_card_legendary.key,
        };
        const bgKey = cardBackgrounds[rarity];

        // Update Shadow Texture
        if (this.shadow) this.shadow.destroy();
        this.shadow = this.scene.add.image(10, 10, bgKey);
        this.shadow.setTint(0x000000);
        this.shadow.setAlpha(0.5);
        this.cardContainer.add(this.shadow);
        this.cardContainer.sendToBack(this.shadow);

        // --- Add elements to Inner Container ---
        const bg = this.scene.add.image(0, 0, bgKey);
        this.innerCardContainer.add(bg);

        this.width = bg.width;
        this.height = bg.height;

        // --- Rarity Effects (Particles & Glows) ---
        if (rarity === 'epic') {
            // Violet Glow on Card
            if (bg.preFX) bg.preFX.addGlow(0xaa00ff, 4, 0, false, 0.1, 32);
            // Violet Particles behind
            this.createRarityParticles(0xaa00ff);
        }
        else if (rarity === 'legendary') {
            // Gold Glow on Card
            if (bg.preFX) bg.preFX.addGlow(0xffd700, 6, 0, false, 0.1, 32);
            // Gold Particles behind
            this.createRarityParticles(0xffd700);
        }

        // Sprite
        const sprite = this.scene.add.sprite(0, 19, unit.textureKey); // Changed y to 10
        sprite.setOrigin(0.5, 1); // Set origin to feet
        this.innerCardContainer.add(sprite);

        // Stars
        const starCount = stars || 1;
        const starScale = 0.5;
        const starSpacing = 30 * starScale; // Increased spacing
        const startX = -starSpacing; // To center the 3 stars
        const startY = -42;

        for (let i = 0; i < 3; i++) {
            const starEmpty = this.scene.add.image(startX + (i * starSpacing), startY, ASSETS.image.star_empty.key);
            starEmpty.setScale(starScale);
            this.innerCardContainer.add(starEmpty);
        }

        for (let i = 0; i < starCount; i++) {
            if (i < 3) { // Make sure we don't draw more than 3 stars
                const starFilled = this.scene.add.image(startX + (i * starSpacing), startY, ASSETS.image.star.key);
                starFilled.setScale(starScale);
                this.innerCardContainer.add(starFilled);
            }
        }


        // Text
        const hpText = this.scene.add.bitmapText(0, 25, 'editundo_55', `HP: ${stats.maxHealth}`, 28)
            .setOrigin(0.5).setLetterSpacing(2).setScale(0.25);
        const atkText = this.scene.add.bitmapText(0, 33, 'editundo_55', `ATK: ${stats.physicalDamage}`, 28)
            .setOrigin(0.5).setLetterSpacing(2).setScale(0.25);
        this.innerCardContainer.add([hpText, atkText]);

        let matkText = null;
        if (stats.magicDamage > 0) {
            matkText = this.scene.add.bitmapText(0, 42, 'editundo_55', `MATK: ${stats.magicDamage}`, 28)
                .setOrigin(0.5).setLetterSpacing(2).setScale(0.25);
            this.innerCardContainer.add(matkText);
        }

        this.components = { bg, sprite, hpText, atkText, matkText };
    }

    setHiddenState() {
        if (this.components.sprite) this.components.sprite.setVisible(false);
        if (this.components.hpText) this.components.hpText.setVisible(false);
        if (this.components.atkText) this.components.atkText.setVisible(false);
        if (this.components.matkText) this.components.matkText.setVisible(false);

        if (this.components.bg) {
            this.components.bg.setTintFill(0xdddddd);
            if (this.components.bg.preFX) this.components.bg.preFX.active = false;
        }
    }

    revealContent(rarity) {
        if (this.components.bg) {
            this.components.bg.clearTint();
            const hasGlow = (rarity === 'epic' || rarity === 'legendary');
            if (this.components.bg.preFX && hasGlow) {
                this.components.bg.preFX.active = true;
            }
        }
        if (this.components.sprite) this.components.sprite.setVisible(true);
        if (this.components.hpText) this.components.hpText.setVisible(true);
        if (this.components.atkText) this.components.atkText.setVisible(true);
        if (this.components.matkText) this.components.matkText.setVisible(true);
    }

    createRarityParticles(tint) {
        // 1. Get current card dimensions
        const w = this.width;
        const h = this.height;

        // 2. Spawn zone covers the whole card (centered)
        const spawnZone = new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h);

        this.rarityEmitter = this.scene.add.particles(0, 0, 'dust_particle', {
            // --- Physics (Matches Dust Effect) ---
            speed: { min: 30, max: 80 },
            angle: { min: 0, max: 360 },
            gravityY: 10,
            lifespan: 750,

            // --- Visuals ---
            scale: { start: 1.0, end: 0 },
            alpha: { start: 0.6, end: 0 },
            tint: tint, // Dynamic Color
            blendMode: 'ADD',

            // --- Emission ---
            emitZone: { type: 'random', source: spawnZone },
            frequency: 50,
            quantity: 2,
        });

        // 3. Add to container
        this.innerCardContainer.add(this.rarityEmitter);

        // 4. Send to Back (renders behind the card sprite)
        this.innerCardContainer.sendToBack(this.rarityEmitter);

        // Optional: Add a slight glow to the particles themselves for extra "pop"
        if (this.rarityEmitter.postFX) {
            this.rarityEmitter.postFX.addGlow(tint, 2, 0, false, 0.1, 16);
        }
    }

    clearRarityParticles() {
        if (this.rarityEmitter) {
            this.rarityEmitter.destroy();
            this.rarityEmitter = null;
        }
    }

    playSpawnAnimation() {
        this.isAnimating = true;
        this.scene.tweens.add({
            targets: this.cardContainer,
            scale: 1.5,
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

    refreshContent(newConfig) {
        this.config = newConfig; // Update the internal config
        const { unit, rarity, stats, stars } = newConfig;

        this.isAnimating = true;
        this.stopIdleAnimation();
        this.outlineFX.outerStrength = 0; // Turn off hover glow

        const jumpDuration = 300;
        const flipDuration = 200;
        const fallDuration = 300;
        let hasRevealed = false;

        const timeline = this.scene.add.timeline([
            {
                at: 0,
                tween: {
                    targets: this.cardContainer,
                    y: this.y - 120,
                    duration: jumpDuration,
                    ease: 'Quad.out'
                }
            },
            {
                at: jumpDuration,
                tween: {
                    targets: this.cardContainer,
                    scaleX: 0,
                    duration: flipDuration / 2,
                    ease: 'Linear'
                }
            },
            {
                at: jumpDuration + (flipDuration / 2),
                run: () => {
                    this.setupCardVisuals(unit, rarity, stats, stars);
                    this.setHiddenState();
                    // Update size on outer container
                    this.cardContainer.setSize(this.width, this.height);
                }
            },
            {
                at: jumpDuration + (flipDuration / 2) + 1,
                tween: {
                    targets: this.cardContainer,
                    scaleX: 1.5,
                    duration: flipDuration / 2,
                    ease: 'Linear'
                }
            },
            {
                at: jumpDuration + flipDuration,
                tween: {
                    targets: this.cardContainer,
                    y: this.y,
                    duration: fallDuration,
                    ease: 'Bounce.out',
                    onUpdate: (tween, target) => {
                        if (!hasRevealed && target.y >= this.y - 10) {
                            hasRevealed = true;
                            this.revealContent(rarity);
                            this.playDustEffect(rarity);
                        }
                    },
                    onComplete: () => {
                        this.isAnimating = false;
                        this.startIdleAnimation();
                    }
                }
            }
        ]);

        timeline.play();
    }

    playDustEffect(rarity) {
        const colors = {
            'common': 0x888888,
            'rare': 0x0088ff,
            'epic': 0xaa00ff,
            'legendary': 0xffd700
        };
        const dustColor = colors[rarity] || 0x888888;

        const cardW = this.width * 2;
        const cardH = this.height * 2;

        const dustZone = new Phaser.Geom.Rectangle(
            this.x - cardW / 2 - 10,
            this.y - cardH / 2 - 10,
            cardW + 20,
            cardH + 20
        );

        const emitter = this.scene.add.particles(0, 0, 'dust_particle', {
            lifespan: 750,
            speed: { min: 30, max: 80 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.0, end: 0 },
            alpha: { start: 0.6, end: 0 },
            gravityY: 10,
            quantity: 1000,
            tint: dustColor,
            emitZone: { type: 'random', source: dustZone },
            emitting: false
        });

        emitter.setDepth(1);
        emitter.explode();

        this.scene.time.delayedCall(1000, () => emitter.destroy());
    }
}