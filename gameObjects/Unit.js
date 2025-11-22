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
            ...stats
        };

        // Defensive checks to prevent NaN values from bad config
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
        this.sprite.setOrigin(0.5, 1); // Set origin to bottom-center
        this.sprite.setData('originalY', originalY);
        this.sprite.setDepth(originalY);
        this.sprite.setScale(1);
        this.healthBar = null;
        this.createHealthBar();
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

        // Background (empty part)
        this.healthBar.fillStyle(0x000000);
        this.healthBar.fillRect(x, y, width, height);

        // Foreground (health part)
        const healthPercentage = this.stats.currentHealth / this.stats.maxHealth;
        
        let healthBarColor = 0xff0000; // Default to red for enemies
        if (this.isPlayer) {
            healthBarColor = 0x00ff00; // Green for players
        }
        this.healthBar.fillStyle(healthBarColor);
        this.healthBar.fillRect(x, y, width * healthPercentage, height);
    }

    addStatusEffect(effect) {
        // In the future, we might want to prevent stacking, but for now, just add it.
        this.statusEffects.push(effect);
    }

    update() {
        // This method will be called from the main game update loop
        this.sprite.setDepth(this.sprite.y + 16);
        this.updateHealthBar();

        // Armor up effect particles
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
                this.armorUpEmitter.setDepth(this.sprite.depth - 1);
            }
            this.armorUpEmitter.setPosition(this.sprite.x, this.sprite.y);
            this.armorUpEmitter.setDepth(99999);
            if (!this.armorUpEmitter.emitting) {
                this.armorUpEmitter.start();
            }
        } else {
            if (this.armorUpEmitter && this.armorUpEmitter.emitting) {
                this.armorUpEmitter.stop();
            }
        }
    }

    calculateDamage(targetUnit) {
        const baseDamage = this.stats.physicalDamage;
        
        // 1. Damage Variance (+/- 20%)
        const variance = (Math.random() - 0.5) * 0.4; // -0.2 to +0.2
        let finalDamage = baseDamage * (1 + variance);

        // 2. Critical Hit Check
        const isCrit = Math.random() < this.stats.critChance;
        if (isCrit) {
            finalDamage *= this.stats.critDamageMultiplier;
        }

        return { damage: finalDamage, isCrit: isCrit };
    }

    attack(target, onComplete) {
        const scene = this.scene;
        const originalX = this.sprite.x;
        const originalY = this.sprite.y;
        const originalAngle = this.sprite.angle;

        const targetX = target.sprite.x;
        const targetY = target.sprite.y;

        // 1. Calculate direction vector
        const dx = targetX - originalX;
        const dy = targetY - originalY;
        const angle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) { // Prevent division by zero
            if (onComplete) onComplete();
            return;
        }

        const moveBackDist = 12; // Increased
        const moveForwardDist = 18; // Increased

        // Tween 3: Return to original position
        const returnTween = {
            targets: this.sprite,
            x: originalX,
            y: originalY,
            angle: originalAngle,
            duration: 250,
            delay: 50, // Hold at impact
            ease: 'Quad.easeOut',
            onComplete: () => {
                if (onComplete) {
                    onComplete();
                }
            }
        };

        // Tween 2: Lunge forward with rotation
        const lungeTween = {
            targets: this.sprite,
            x: originalX + (dx / distance) * moveForwardDist,
            y: originalY + (dy / distance) * moveForwardDist,
            angle: -angle / 5, // More pronounced rotation, reversed direction
            duration: 180,
            ease: 'Quad.easeIn',
            onComplete: () => {
                scene.tweens.add(returnTween);
            }
        };
        
        // Tween 1: Move back (this one starts the chain)
        scene.tweens.add({
            targets: this.sprite,
            x: originalX - (dx / distance) * moveBackDist,
            y: originalY - (dy / distance) * moveBackDist,
            duration: 120,
            ease: 'Sine.easeOut',
            onComplete: () => {
                scene.tweens.add(lungeTween);
            }
        });
    }

    takeDamage(damageInfo, attacker = null) {
        const { damage, isCrit } = damageInfo;
        let finalDamage = damage;
        
        // Check for damage reduction effects
        const armorUpEffect = this.statusEffects.find(effect => effect.type === 'armor_up');
        if (armorUpEffect) {
            finalDamage *= 0.7; // 30% damage reduction
        }

        this.stats.currentHealth -= finalDamage;
        if (this.stats.currentHealth < 0) {
            this.stats.currentHealth = 0;
        }
        this.updateHealthBar();
        this.scene.events.emit('unit_stats_changed', this);

        // Damage Number Text
        const damageString = Math.round(finalDamage).toString();
        const textColor = isCrit ? '#ffff00' : '#ff0000'; // Yellow for crit, red for normal
        const textStyle = {
            fontFamily: '"Pixelify Sans"',
            fontSize: isCrit ? '20px' : '16px', // Larger font for crits
            color: textColor,
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        };
        const damageText = this.scene.add.text(this.sprite.x, this.sprite.y - 30, damageString, textStyle);
        damageText.setOrigin(0.5, 0.5);
        damageText.setDepth(this.sprite.depth + 2);

        this.scene.tweens.add({
            targets: damageText,
            x: damageText.x + 30,
            y: damageText.y - (isCrit ? 50 : 40),
            alpha: 0,
            duration: isCrit ? 1500 : 1200, // Lasts a bit longer for crits
            ease: 'Power1',
            onComplete: () => {
                damageText.destroy();
            }
        });

        // Knockback tween
        if (attacker && this.stats.currentHealth > 0) { // Only do knockback if unit survives
            const originalX = this.sprite.x;
            const originalY = this.sprite.y;

            const dx = originalX - attacker.sprite.x;
            const dy = originalY - attacker.sprite.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const knockbackDistance = 8;

            if (distance > 0) {
                const moveX = originalX + (dx / distance) * knockbackDistance;
                const moveY = originalY + (dy / distance) * knockbackDistance;

                this.scene.tweens.add({
                    targets: this.sprite,
                    x: moveX,
                    y: moveY,
                    duration: 80,
                    ease: 'Quad.easeOut',
                    yoyo: true,
                });
            }
        }

        // Emit particles event
        if (attacker) {
            this.scene.events.emit('unit_damaged', this.sprite.x, this.sprite.y, attacker, this);
        } else {
            this.scene.events.emit('unit_damaged', this.sprite.x, this.sprite.y, null, this);
        }

        if (this.stats.currentHealth === 0) {
            this.die();
        }
    }

    die() {
        console.log(`${this.name} has been defeated.`);
        this.scene.events.emit('unit_died', this);
        // Play a death animation
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
                this.destroy();
            }
        });
    }
    
    destroy() {
        this.sprite.destroy();
        this.healthBar.destroy();
        if (this.armorUpEmitter) {
            this.armorUpEmitter.destroy();
        }
    }
}
