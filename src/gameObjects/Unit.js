import ASSETS from '../assets.js';

export class Unit {
    constructor(scene, { gridX, gridY, texture, frame, name, stats, isPlayer = false, moves = [] }) {
        this.scene = scene;
        this.name = name;
        this.isPlayer = isPlayer;
        this.stats = {
            maxHealth: 100,
            currentHealth: 100,
            moveRange: 4,
            physicalDamage: 10,
            magicDamage: 0,
            speed: 10,
            maxAp: 1,
            currentAp: 1,
            critChance: 0.05,
            critDamageMultiplier: 1.5,
            armor: 0,
            ...stats
        };

        // Defensive checks
        if (typeof this.stats.physicalDamage !== 'number') this.stats.physicalDamage = 10;
        if (typeof this.stats.critChance !== 'number') this.stats.critChance = 0.05;
        if (typeof this.stats.critDamageMultiplier !== 'number') this.stats.critDamageMultiplier = 1.5;

        this.moves = moves;
        this.statusEffects = [];
        this.armorUpEmitter = null;

        this.gridPos = { x: gridX, y: gridY };

        this.hasMoved = false;
        this.usedStandardAction = false;

        const screenX = scene.origin.x + (this.gridPos.x - this.gridPos.y) * scene.mapConsts.HALF_WIDTH;
        const originalY = scene.origin.y + (this.gridPos.x + this.gridPos.y) * scene.mapConsts.QUARTER_HEIGHT;

        this.sprite = scene.add.sprite(screenX, originalY, texture, frame);
        this.sprite.setOrigin(0.5, 1);
        this.sprite.setData('originalY', originalY);
        this.sprite.setDepth(originalY);
        this.sprite.setScale(1);

        // --- NEW: Shadow Property ---
        this.shadow = null;
        this.createShadow(); // Generate shadow immediately

        this.healthBar = null;
        this.createHealthBar();
    }

    // --- NEW: Create Shadow Helper ---
    createShadow() {
        if (this.shadow) return;

        this.shadow = this.scene.add.image(this.sprite.x, this.sprite.y, this.sprite.texture.key, this.sprite.frame.name);

        this.shadow.setTint(0x000000);
        this.shadow.setAlpha(0.3);
        this.shadow.setScale(1, - 0.5);


        this.shadow.setOrigin(0.5, 0.85);
        this.shadow.setDepth(this.sprite.depth - 0.1);

        this.shadow.skewX = - 0.5;
    }
    createHealthBar() {
        this.healthBar = this.scene.add.graphics();
        this.updateHealthBar();
    }

    updateHealthBar() {
        if (!this.healthBar) return;

        this.healthBar.clear();
        this.healthBar.setDepth(this.sprite.depth + 1);

        const width = 24;
        const height = 4;
        const x = this.sprite.x - (width / 2);
        const y = this.sprite.y - 48;
        const borderThickness = 1;

        // Border
        this.healthBar.fillStyle(0x000000);
        this.healthBar.fillRect(x - borderThickness, y - borderThickness, width + borderThickness * 2, height + borderThickness * 2);

        // Background
        this.healthBar.fillStyle(0x000000);
        this.healthBar.fillRect(x, y, width, height);

        // Foreground
        const healthPercentage = Math.max(0, this.stats.currentHealth / this.stats.maxHealth);
        let healthBarColor = this.isPlayer ? 0x00ff00 : 0xff0000;

        this.healthBar.fillStyle(healthBarColor);
        this.healthBar.fillRect(x, y, width * healthPercentage, height);
    }

    addStatusEffect(effect) {
        this.statusEffects.push(effect);
    }

    getEffectiveStats() {
        const effectiveStats = { ...this.stats };
        this.statusEffects.forEach(effect => {
            if (effect.type === 'armor_up') {
                effectiveStats.armor += effect.amount || 0;
            }
        });
        return effectiveStats;
    }

    update() {
        // --- NEW: Synchronize Shadow ---
        if (this.shadow) {
            // 1. Sync Position (If not strictly tweening, this acts as a safety anchor)
            // Note: During jump tweens, we usually tween the shadow independently,
            // but for idle/standing, this keeps it attached.
            if (!this.scene.isMoving) {
                this.shadow.x = this.sprite.x;
                this.shadow.y = this.sprite.y;
            }

            // 2. Sync Animation Frame
            if (this.sprite.frame.name !== this.shadow.frame.name) {
                this.shadow.setFrame(this.sprite.frame.name);
            }

            // 3. Sync Flip
            this.shadow.flipX = this.sprite.flipX;

            // 4. Sync Depth (Always slightly behind unit)
            this.shadow.setDepth(this.sprite.depth - 0.1);

            // 5. Visibility
            this.shadow.visible = this.sprite.visible;
            this.shadow.alpha = this.sprite.alpha * 0.3; // inherit alpha fade
        }

        // Update depth based on Y for isometric sorting
        this.sprite.setDepth(this.sprite.y + 16);
        this.updateHealthBar();

        // Armor up logic (Unchanged)
        const armorUpEffect = this.statusEffects.find(effect => effect.type === 'armor_up');
        if (armorUpEffect) {
            if (!this.armorUpEmitter) {
                const emitterWidth = this.sprite.displayWidth * 0.8;
                const line = new Phaser.Geom.Line(-emitterWidth / 2, 0, emitterWidth / 2, 0);

                this.armorUpEmitter = this.scene.add.particles(0, 0, 'particle', {
                    speed: {min: 20, max: 40},
                    angle: {min: -100, max: -80},
                    scale: {start: 4, end: 0},
                    alpha: {start: 0.6, end: 0},
                    lifespan: 2000,
                    tint: [0x87CEEB, 0x4682B4, 0x6495ED],
                    frequency: 50,
                    emitZone: {type: 'random', source: line}
                });
            }
            this.armorUpEmitter.setPosition(this.sprite.x, this.sprite.y);
            this.armorUpEmitter.setDepth(99999);
            if (!this.armorUpEmitter.emitting) this.armorUpEmitter.start();
        } else {
            if (this.armorUpEmitter && this.armorUpEmitter.emitting) this.armorUpEmitter.stop();
        }
    }

    calculateDamage(targetUnit) {
        const baseDamage = this.stats.physicalDamage;
        const targetStats = targetUnit.getEffectiveStats();

        // Variance
        const variance = (Math.random() - 0.5) * 0.2;
        let damage = baseDamage * (1 + variance);

        // Crit
        const isCrit = Math.random() < this.stats.critChance;
        if (isCrit) {
            damage *= this.stats.critDamageMultiplier;
        }

        // Armor
        let damageMultiplier = 1;
        for (let i = 1; i <= targetStats.armor; i++) {
            damageMultiplier *= (1 - (1 / (3 * i + 2)));
        }
        damage *= damageMultiplier;

        return { damage: Math.floor(damage), isCrit: isCrit };
    }

    // --- UPDATED: The "Lunge" Attack Animation ---
    attack(target, onImpactCallback) {
        const scene = this.scene;

        // Define objects to animate (Sprite + Shadow)
        const targets = this.shadow ? [this.sprite, this.shadow] : [this.sprite];

        // 1. Calculate direction vector
        const startX = this.sprite.x;
        const startY = this.sprite.y;
        const dx = target.sprite.x - startX;
        const dy = target.sprite.y - startY;

        // Lunge distance (40% of the way to the enemy)
        const lungeFactor = 0.4;
        const lungeX = dx * lungeFactor;
        const lungeY = dy * lungeFactor;

        // Store original position if not already stored
        const originalY = this.sprite.getData('originalY') || startY;

        // SEQUENCE: Windup -> Strike -> Impact -> Recoil

        // 1. Wind Up (Pull back slowly)
        scene.tweens.add({
            targets: targets,
            x: startX - (lungeX * 0.2),
            y: startY - (lungeY * 0.2),
            duration: 150,
            ease: 'Quad.easeOut',
            onComplete: () => {

                // 2. The Strike (Dash forward FAST)
                scene.tweens.add({
                    targets: targets,
                    x: startX + lungeX,
                    y: startY + lungeY,
                    duration: 60, // Very fast
                    ease: 'Expo.easeIn',
                    onComplete: () => {

                        // --- IMPACT MOMENT ---
                        if (onImpactCallback) onImpactCallback();

                        // 3. Recoil (Bounce back)
                        scene.tweens.add({
                            targets: targets,
                            x: startX,
                            y: originalY,
                            duration: 300,
                            delay: 100, // Small "Hit Stop" pause at the point of impact
                            ease: 'Back.easeOut'
                        });
                    }
                });
            }
        });
    }

    lungeUp(onImpactCallback) {
        const scene = this.scene;

        // Define objects to animate (Sprite + Shadow)
        const targets = this.shadow ? [this.sprite, this.shadow] : [this.sprite];

        // 1. Calculate direction vector
        const startX = this.sprite.x;
        const startY = this.sprite.y;
        const lungeY = -20; // Move 20 pixels up

        // Store original position if not already stored
        const originalY = this.sprite.getData('originalY') || startY;

        // SEQUENCE: Windup -> Strike -> Impact -> Recoil

        // 1. Wind Up (Pull back slowly)
        scene.tweens.add({
            targets: targets,
            y: startY + 10,
            duration: 150,
            ease: 'Quad.easeOut',
            onComplete: () => {

                // 2. The Strike (Dash forward FAST)
                scene.tweens.add({
                    targets: targets,
                    y: startY + lungeY,
                    duration: 60, // Very fast
                    ease: 'Expo.easeIn',
                    onComplete: () => {

                        // --- IMPACT MOMENT ---
                        if (onImpactCallback) onImpactCallback();

                        // 3. Recoil (Bounce back)
                        scene.tweens.add({
                            targets: targets,
                            x: startX,
                            y: originalY,
                            duration: 300,
                            delay: 100, // Small "Hit Stop" pause at the point of impact
                            ease: 'Back.easeOut'
                        });
                    }
                });
            }
        });
    }

    takeDamage(damageInfo, attacker = null, move = null) {
        const { damage, isCrit } = damageInfo;
        const finalDamage = Math.floor(damage);

        this.stats.currentHealth -= finalDamage;
        if (this.stats.currentHealth < 0) this.stats.currentHealth = 0;

        this.updateHealthBar();
        this.scene.events.emit('unit_stats_changed', this);

        // --- FIX: Wrap flash in a 5ms delay ---
        // This ensures it runs AFTER 'clearHighlights()' cleans the board.
        this.scene.time.delayedCall(5, () => {
            if (this.sprite && this.sprite.active) {
                this.sprite.setTintFill(0xffffff); // Turn White

                // Clear the white flash after 100ms
                this.scene.time.delayedCall(100, () => {
                    if (this.sprite && this.sprite.active) {
                        this.sprite.clearTint();
                    }
                });
            }
        });

        // Slash Effect Sprite
        if (move && move.type === 'attack') {
            const slashEffect = this.scene.add.sprite(this.sprite.x, this.sprite.y - 16, ASSETS.image.melee_slash_effect.key);
            slashEffect.setDepth(this.sprite.depth + 10);
            slashEffect.setScale(1);
            slashEffect.setAngle(Phaser.Math.Between(0, 360));
            this.scene.tweens.add({
                targets: slashEffect,
                alpha: 0,
                duration: 300,
                onComplete: () => slashEffect.destroy()
            });
        }

        // Damage Number
        const damageString = finalDamage.toString();
        const textColor = isCrit ? '#ffff00' : '#ff0000';
        const textStyle = {
            fontFamily: '"Pixelify Sans"',
            fontSize: isCrit ? '26px' : '20px',
            color: textColor,
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        };

        const damageText = this.scene.add.text(this.sprite.x, this.sprite.y - 40, damageString, textStyle);
        damageText.setOrigin(0.5, 0.5);
        damageText.setDepth(999999);
        damageText.setScale(0.5); // Start small for pop effect

        // Animate Damage Text (Pop up and float)
        this.scene.tweens.add({
            targets: damageText,
            scaleX: 1,
            scaleY: 1,
            y: damageText.y - 10,
            duration: 200,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: damageText,
                    y: damageText.y - 40,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => damageText.destroy()
                });
            }
        });

        // Knockback (Unchanged)
        if (attacker && this.stats.currentHealth > 0) {
            const targets = this.shadow ? [this.sprite, this.shadow] : [this.sprite];
            const dx = this.sprite.x - attacker.sprite.x;
            const dy = this.sprite.y - attacker.sprite.y;

            const dist = Math.sqrt(dx*dx + dy*dy) || 1;
            const pushX = (dx / dist) * 10;
            const pushY = (dy / dist) * 10;

            this.scene.tweens.add({
                targets: targets,
                x: this.sprite.x + pushX,
                y: this.sprite.y + pushY,
                duration: 60,
                yoyo: true,
                ease: 'Sine.easeInOut',
            });
        }

        this.scene.events.emit('unit_damaged', this.sprite.x, this.sprite.y, attacker, this, finalDamage, isCrit);

        if (this.stats.currentHealth === 0) {
            this.die();
        }
    }

    die() {
        console.log(`${this.name} has been defeated.`);
        this.scene.events.emit('unit_died', this);

        // Hide UI elements immediately
        if (this.healthBar) this.healthBar.visible = false;
        if (this.shadow) this.shadow.visible = false;

        // Play a death animation
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            y: this.sprite.y + 10, // Sink into ground
            duration: 1000,
            onComplete: () => {
                this.destroy();
            }
        });
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.shadow) this.shadow.destroy(); // Clean up shadow
        if (this.healthBar) this.healthBar.destroy();
        if (this.armorUpEmitter) this.armorUpEmitter.destroy();
    }
}