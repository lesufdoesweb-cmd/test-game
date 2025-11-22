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
            ...stats
        };

        this.moves = moves;


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
        this.healthBar.fillStyle(0xff0000);
        this.healthBar.fillRect(x, y, width * healthPercentage, height);
    }

    update() {
        // This method will be called from the main game update loop
        this.sprite.setDepth(this.sprite.y + 16);
        this.updateHealthBar();
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

    takeDamage(amount, attacker = null) {
        this.stats.currentHealth -= amount;
        if (this.stats.currentHealth < 0) {
            this.stats.currentHealth = 0;
        }
        this.updateHealthBar();
        this.scene.events.emit('unit_stats_changed', this);

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
    }
}
