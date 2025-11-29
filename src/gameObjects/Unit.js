import ASSETS from '../assets.js';
import { getBoostedStats } from '../utils/rarity.js';

export class Unit {
    constructor(scene, { gridX, gridY, texture, frame, name, stats, isPlayer = false, moves = [], rarity = 'common' }) {
        this.scene = scene;
        this.name = name;
        this.isPlayer = isPlayer;
        this.rarity = rarity;
        this.stats = getBoostedStats({
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
        }, rarity);

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
        this.isHighlighted = false;

        // --- NEW: Flag to track if we are physically moving (hopping) ---
        this.isMovingSprite = false;

        const screenX = scene.origin.x + (this.gridPos.x - this.gridPos.y) * scene.mapConsts.HALF_WIDTH;
        const originalY = scene.origin.y + (this.gridPos.x + this.gridPos.y) * scene.mapConsts.QUARTER_HEIGHT;

        this.sprite = scene.add.sprite(screenX, originalY, texture, frame);
        this.sprite.setOrigin(0.5, 1);
        this.sprite.setData('originalY', originalY);
        this.sprite.setDepth(originalY);
        this.sprite.setScale(1);

        // --- Idle Tween Reference ---
        this.idleTween = null;

        // --- Shadow Property ---
        this.shadow = null;
        this.createShadow(); // Generate shadow immediately

        this.healthBar = null;
        this.createHealthBar();
    }

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
        if (!this.healthBar || !this.sprite) return;

        this.healthBar.clear();
        this.healthBar.setDepth(this.sprite.depth + 1);

        const width = 24;
        const height = 4;

        // --- LOGIC FIX: Stick to Sprite if moving/hopping, stick to Ground if Idle ---
        let anchorY;
        if (this.isMovingSprite) {
            anchorY = this.sprite.y;
        } else {
            anchorY = this.sprite.getData('originalY') || this.sprite.y;
        }

        const x = this.sprite.x - (width / 2);
        const y = anchorY - 48; // Position above the anchor point
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

    startIdle() {
        // If we are already idling or the sprite is destroyed, do nothing
        if (this.idleTween && this.idleTween.isPlaying()) return;
        if (!this.sprite || !this.sprite.active) return;

        const originalY = this.sprite.getData('originalY');

        // Safety: Ensure we start from the correct floor position
        this.sprite.y = originalY;

        // Randomize to prevent synchronization
        const randomDuration = 800 + Math.random() * 400;
        const randomDelay = Math.random() * 500;

        this.idleTween = this.scene.tweens.add({
            targets: this.sprite,
            y: originalY - 3, // Move up 2 pixels
            duration: randomDuration,
            delay: randomDelay,
            yoyo: true,
            repeat: -1,
            ease: 'Linear'
        });
    }

    stopIdle() {
        if (this.sprite) {
            this.scene.tweens.killTweensOf(this.sprite);
        }
        if (this.shadow) {
            this.scene.tweens.killTweensOf(this.shadow);
        }
        this.idleTween = null;

        // Reset to floor immediately
        if (this.sprite && this.sprite.active) {
            const originalY = this.sprite.getData('originalY');
            if (originalY !== undefined) {
                this.sprite.y = originalY;
                if (this.shadow) {
                    this.shadow.y = this.sprite.getData('originalY') || this.sprite.y;
                }
            }
        }
    }

    update() {
        // --- Synchronize Shadow ---
        if (this.shadow) {
            if (!this.scene.isMoving) {
                this.shadow.x = this.sprite.x;
                // Shadow stays on the "ground" (originalY) even if sprite bobs up
                this.shadow.y = this.sprite.getData('originalY') || this.sprite.y;
            }

            // Sync Animation Frame
            if (this.sprite.frame.name !== this.shadow.frame.name) {
                this.shadow.setFrame(this.sprite.frame.name);
            }

            // Sync Flip
            this.shadow.flipX = this.sprite.flipX;

            // Sync Depth (Always slightly behind unit)
            const depthY = this.sprite.getData('originalY') || this.sprite.y;
            this.shadow.setDepth(depthY - 0.1);

            // Visibility
            this.shadow.visible = this.sprite.visible;
            this.shadow.alpha = this.sprite.alpha * 0.3; // inherit alpha fade
        }

        // Update depth based on Y for isometric sorting
        const depthY = this.sprite.getData('originalY') || this.sprite.y;
        this.sprite.setDepth(depthY + 16);

        this.updateHealthBar();

        const burnEffect = this.statusEffects.find(effect => effect.type === 'burn');
        if (burnEffect) {
            this.sprite.setTint(0xff0000);
        }
        const freezeEffect = this.statusEffects.find(effect => effect.type === 'freeze');
        if (freezeEffect) {
            this.sprite.setTint(0x0000ff);
        }

        // Armor up logic
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

    calculateDamage(targetUnit, ability) {
        let baseDamage = 0;
        if (ability.damageType === 'magical') {
            baseDamage = this.stats.magicDamage || 0;
        } else {
            baseDamage = this.stats.physicalDamage || 0;
        }

        baseDamage *= (ability.modifier || 1.0);

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

    calculateHeal(healAbility) {
        const baseHeal = healAbility.amount || 0;
        const modifier = healAbility.modifier || 1.0;
        return Math.floor(baseHeal * modifier);
    }

    attack(target, onImpactCallback) {
        this.stopIdle(); // Stop bobbing

        const scene = this.scene;
        const targets = this.shadow ? [this.sprite, this.shadow] : [this.sprite];

        const startX = this.sprite.x;
        const startY = this.sprite.y;
        const dx = target.sprite.x - startX;
        const dy = target.sprite.y - startY;

        const lungeFactor = 0.4;
        const lungeX = dx * lungeFactor;
        const lungeY = dy * lungeFactor;

        const originalY = this.sprite.getData('originalY') || startY;

        // SEQUENCE: Windup -> Strike -> Impact -> Recoil
        scene.tweens.add({
            targets: targets,
            x: startX - (lungeX * 0.2),
            y: startY - (lungeY * 0.2),
            duration: 150,
            ease: 'Quad.easeOut',
            onComplete: () => {
                scene.tweens.add({
                    targets: targets,
                    x: startX + lungeX,
                    y: startY + lungeY,
                    duration: 60,
                    ease: 'Expo.easeIn',
                    onComplete: () => {
                        if (onImpactCallback) onImpactCallback();
                        scene.tweens.add({
                            targets: targets,
                            x: startX,
                            y: originalY,
                            duration: 300,
                            delay: 100,
                            ease: 'Back.easeOut',
                            onComplete: () => {
                                this.startIdle(); // Resume bobbing
                            }
                        });
                    }
                });
            }
        });
    }

    lungeUp(onImpactCallback) {
        this.stopIdle(); // Stop bobbing

        const scene = this.scene;
        const targets = this.shadow ? [this.sprite, this.shadow] : [this.sprite];
        const startX = this.sprite.x;
        const startY = this.sprite.y;
        const lungeY = -20;

        const originalY = this.sprite.getData('originalY') || startY;

        scene.tweens.add({
            targets: targets,
            y: startY + 10,
            duration: 150,
            ease: 'Quad.easeOut',
            onComplete: () => {
                scene.tweens.add({
                    targets: targets,
                    y: startY + lungeY,
                    duration: 60,
                    ease: 'Expo.easeIn',
                    onComplete: () => {
                        if (onImpactCallback) onImpactCallback();
                        scene.tweens.add({
                            targets: targets,
                            x: startX,
                            y: originalY,
                            duration: 300,
                            delay: 100,
                            ease: 'Back.easeOut',
                            onComplete: () => {
                                this.startIdle(); // Resume bobbing
                            }
                        });
                    }
                });
            }
        });
    }

    heal(amount) {
        this.stats.currentHealth += amount;
        if (this.stats.currentHealth > this.stats.maxHealth) {
            this.stats.currentHealth = this.stats.maxHealth;
        }
        this.updateHealthBar();
        this.scene.events.emit('unit_stats_changed', this);
    }

    takeDamage(damageInfo, attacker = null, move = null) {
        this.stopIdle(); // Stop bobbing to react to damage

        const { damage, isCrit } = damageInfo;
        const finalDamage = Math.floor(damage);

        this.stats.currentHealth -= finalDamage;
        if (this.stats.currentHealth < 0) this.stats.currentHealth = 0;

        this.updateHealthBar();
        this.scene.events.emit('unit_stats_changed', this);

        this.scene.time.delayedCall(5, () => {
            if (this.sprite && this.sprite.active) {
                this.sprite.setTintFill(0xffffff);
                this.scene.time.delayedCall(100, () => {
                    if (this.sprite && this.sprite.active) {
                        this.sprite.clearTint();
                    }
                });
            }
        });

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
        damageText.setScale(0.5);

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
                onComplete: () => {
                    this.startIdle(); // Resume bobbing after knockback
                }
            });
        } else if (this.stats.currentHealth > 0) {
            this.scene.time.delayedCall(200, () => {
                this.startIdle();
            });
        }

        this.scene.events.emit('unit_damaged', this.sprite.x, this.sprite.y, attacker, this, finalDamage, isCrit);

        if (this.stats.currentHealth === 0) {
            this.die();
        }
    }

    die() {
        this.stopIdle();
        console.log(`${this.name} has been defeated.`);
        this.scene.events.emit('unit_died', this);

        if (this.healthBar) this.healthBar.visible = false;
        if (this.shadow) this.shadow.visible = false;

        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            y: this.sprite.y + 10,
            duration: 1000,
            onComplete: () => {
                this.destroy();
            }
        });
    }

    destroy() {
        this.stopIdle();
        if (this.sprite) this.sprite.destroy();
        if (this.shadow) this.shadow.destroy();
        if (this.healthBar) this.healthBar.destroy();
        if (this.armorUpEmitter) this.armorUpEmitter.destroy();
    }
}