import ASSETS from '../assets.js';

export class UnitCard {
    constructor(scene, x, y, { unit, rarity, stats }) {
        this.scene = scene;
        this.x = x;
        this.y = y;

        this.legendaryEmitter = null;

        // Container
        this.cardContainer = scene.add.container(x, y);
        this.cardContainer.setDepth(10);
        this.cardContainer.setScale(2);

        // Shadow (Inside container, slightly offset)
        this.shadow = scene.add.image(10, 10, ASSETS.image.unit_card_common.key);
        this.shadow.setTint(0x000000);
        this.shadow.setAlpha(0.5);
        this.cardContainer.add(this.shadow);

        this.setupCardVisuals(unit, rarity, stats);

        this.cardContainer.setScale(0);
        this.playSpawnAnimation();
    }

    setupCardVisuals(unit, rarity, stats) {
        // 1. Cleanup: Remove everything except shadow
        this.cardContainer.list.forEach((child) => {
            if (child !== this.shadow) child.destroy();
        });

        // Explicitly clear old emitters so they don't linger
        this.clearLegendaryParticles();

        const cardBackgrounds = {
            'common': ASSETS.image.unit_card_common.key,
            'rare': ASSETS.image.unit_card_rare.key,
            'epic': ASSETS.image.unit_card_epic.key,
            'legendary': ASSETS.image.unit_card_legendary.key,
        };
        const bgKey = cardBackgrounds[rarity];

        // 2. Update Shadow Texture
        this.shadow.setTexture(bgKey);
        this.cardContainer.sendToBack(this.shadow);

        // 3. Card Background
        const bg = this.scene.add.image(0, 0, bgKey);
        this.cardContainer.add(bg);

        this.width = bg.width;
        this.height = bg.height;

        // 4. Glow FX (Applied cleanly to the new BG)
        if (rarity === 'epic' && bg.preFX) {
            bg.preFX.addGlow(0xaa00ff, 4, 0, false, 0.1, 32);
        } else if (rarity === 'legendary') {
            if (bg.preFX) bg.preFX.addGlow(0xffd700, 6, 0, false, 0.1, 32);
            this.createLegendaryParticles();
        }

        // 5. Unit Sprite
        const sprite = this.scene.add.sprite(0, -10, unit.textureKey);
        this.cardContainer.add(sprite);

        // 6. Text
        const hpText = this.scene.add.bitmapText(0, 25, 'editundo_55', `HP: ${stats.maxHealth}`, 28)
            .setOrigin(0.5).setLetterSpacing(2).setScale(0.25);

        const atkText = this.scene.add.bitmapText(0, 33, 'editundo_55', `ATK: ${stats.physicalDamage}`, 28)
            .setOrigin(0.5).setLetterSpacing(2).setScale(0.25);

        this.cardContainer.add([hpText, atkText]);

        let matkText = null;
        if (stats.magicDamage > 0) {
            matkText = this.scene.add.bitmapText(0, 70, 'editundo_55', `MATK: ${stats.magicDamage}`, 28)
                .setOrigin(0.5).setLetterSpacing(2).setScale(0.25);
            this.cardContainer.add(matkText);
        }

        this.components = { bg, sprite, hpText, atkText, matkText };
    }

    setHiddenState() {
        if (this.components.sprite) this.components.sprite.setVisible(false);
        if (this.components.hpText) this.components.hpText.setVisible(false);
        if (this.components.atkText) this.components.atkText.setVisible(false);
        if (this.components.matkText) this.components.matkText.setVisible(false);

        if (this.components.bg) {
            // Simulate White Card Back
            this.components.bg.setTintFill(0xdddddd);
            // Temporarily disable glow while flipped
            if (this.components.bg.preFX) this.components.bg.preFX.active = false;
        }
    }

    revealContent(rarity) {
        // 1. Remove the "Back of Card" tint
        if (this.components.bg) {
            this.components.bg.clearTint();

            // 2. Re-enable glow ONLY if it's supposed to be there (Epic/Legendary)
            // This prevents the "Lingering Glow" bug
            const hasGlow = (rarity === 'epic' || rarity === 'legendary');
            if (this.components.bg.preFX && hasGlow) {
                this.components.bg.preFX.active = true;
            }
        }

        // 3. Show content
        if (this.components.sprite) this.components.sprite.setVisible(true);
        if (this.components.hpText) this.components.hpText.setVisible(true);
        if (this.components.atkText) this.components.atkText.setVisible(true);
        if (this.components.matkText) this.components.matkText.setVisible(true);
    }

    createLegendaryParticles() {
        const spawnZone = new Phaser.Geom.Rectangle(this.x - 40, this.y - 50, 80, 100);

        this.legendaryEmitter = this.scene.add.particles(0, 0, 'glow_particle', {
            speed: { min: 120, max: 200 },
            angle: { min: 0, max: 360 },
            emitZone: { type: 'random', source: spawnZone },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1200,
            blendMode: 'ADD',
            tint: 0xffd700,
            quantity: 3,
            frequency: 60,
        });

        this.legendaryEmitter.setDepth(9);

        if (this.legendaryEmitter.preFX) {
            this.legendaryEmitter.preFX.addGlow(0xffd700, 4, 0, false, 0.1, 32);
        }
    }

    clearLegendaryParticles() {
        if (this.legendaryEmitter) {
            this.legendaryEmitter.destroy();
            this.legendaryEmitter = null;
        }
    }

    playSpawnAnimation() {
        this.scene.tweens.add({
            targets: this.cardContainer,
            scale: 2,
            duration: 400,
            ease: 'Back.out'
        });
    }

    destroy() {
        if(this.cardContainer) this.cardContainer.destroy();
        this.clearLegendaryParticles();
    }

    // --- REFRESH LOGIC ---
    refreshContent(newConfig) {

        const jumpDuration = 300;
        const flipDuration = 200;
        const fallDuration = 300;

        const timeline = this.scene.add.timeline([
            // 1. Jump Up
            {
                at: 0,
                tween: {
                    targets: this.cardContainer,
                    y: this.y - 120,
                    duration: jumpDuration,
                    ease: 'Quad.out'
                }
            },
            // 2. Flip Halfway (Hide content)
            {
                at: jumpDuration,
                tween: {
                    targets: this.cardContainer,
                    scaleX: 0,
                    duration: flipDuration / 2,
                    ease: 'Linear'
                }
            },
            // 3. Swap to White Back
            {
                at: jumpDuration + (flipDuration / 2),
                run: () => {
                    // Setup new data but hide it behind the "White Back" look
                    this.setupCardVisuals(newConfig.unit, newConfig.rarity, newConfig.stats);
                    this.setHiddenState();
                }
            },
            // 4. Flip Open (Show White Back)
            {
                at: jumpDuration + (flipDuration / 2) + 1,
                tween: {
                    targets: this.cardContainer,
                    scaleX: 2,
                    duration: flipDuration / 2,
                    ease: 'Linear'
                }
            },
            // 5. Fall Down & REVEAL ON LANDING
            {
                at: jumpDuration + flipDuration,
                tween: {
                    targets: this.cardContainer,
                    y: this.y,
                    duration: fallDuration,
                    ease: 'Bounce.out',
                    onComplete: () => {
                        // 1. Reveal IMMEDIATELY upon landing
                        this.revealContent(newConfig.rarity);
                        // 2. Play dust
                        this.playDustEffect();
                    }
                }
            }
        ]);

        timeline.play();
    }

    playDustEffect() {
        // Define a rectangle zone that encompasses the entire card
        // This makes dust appear "all around"
        const cardW = this.width * 2;
        const cardH = this.height * 2;

        const dustZone = new Phaser.Geom.Rectangle(
            this.x - cardW / 2 - 10, // x
            this.y - cardH / 2 - 10, // y
            cardW + 20,              // width
            cardH + 20               // height
        );

        const emitter = this.scene.add.particles(0, 0, 'dust_particle', {
            lifespan: 750, // 0.75 seconds
            speed: { min: 30, max: 80 }, // Slow drifting dust
            angle: { min: 0, max: 360 }, // All directions
            scale: { start: 1.0, end: 0 },
            alpha: { start: 0.6, end: 0 },
            gravityY: 10,
            quantity: 30,
            tint: 0x888888, // Gray dust
            emitZone: { type: 'random', source: dustZone },
            emitting: false
        });

        emitter.setDepth(100);
        emitter.explode();

        this.scene.time.delayedCall(1000, () => emitter.destroy());
    }
}