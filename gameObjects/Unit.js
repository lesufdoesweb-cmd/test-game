import ASSETS from '../assets.js';

export class Unit {
    constructor(scene, { gridX, gridY, texture, frame, name, stats, isPlayer = false }) {
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

        this.moves = [];
        if (this.name === 'Archer') {
            this.moves.push({ name: 'Move', type: 'move', range: this.stats.moveRange, cost: 0, cooldown: 1, currentCooldown: 0, icon: ASSETS.image.move_icon.key });
            this.moves.push({ name: 'Attack', type: 'long_attack', range: 4, cost: 1, cooldown: 1, currentCooldown: 0, icon: ASSETS.image.arrow_attack_icon.key });
        } else { // Default moves for other units (e.g., Orc)
            this.moves.push({ name: 'Move', type: 'move', range: this.stats.moveRange, cost: 0, cooldown: 1, currentCooldown: 0, icon: ASSETS.image.move_icon.key });
            this.moves.push({ name: 'Attack', type: 'attack', range: 1, cost: 1, cooldown: 1, currentCooldown: 0, icon: ASSETS.image.basic_attack_icon.key });
        }


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

    attack(target, moveType) {
        target.takeDamage(this.stats.physicalDamage, this);
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
