import ASSETS from '../assets.js';

export class Unit {
    constructor(scene, { gridX, gridY, texture, frame, name, stats }) {
        this.scene = scene;
        this.name = name;
        this.stats = {
            maxHealth: 100,
            currentHealth: 100,
            moveRange: 4,
            physicalDamage: 10,
            magicDamage: 0,
            speed: 10,
            ...stats
        };

        this.moves = [
            { name: 'Move', type: 'move', range: this.stats.moveRange },
            { name: 'Attack', type: 'attack', range: 1 }
        ];

        this.gridPos = { x: gridX, y: gridY };

        const screenX = scene.origin.x + (this.gridPos.x - this.gridPos.y) * scene.mapConsts.HALF_WIDTH;
        const screenY = scene.origin.y + (this.gridPos.x + this.gridPos.y) * scene.mapConsts.QUARTER_HEIGHT;

        this.sprite = scene.add.sprite(screenX, screenY - 16, texture, frame);
        this.sprite.setDepth(9999);

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
        this.healthBar.setDepth(99999);

        const width = 24;
        const height = 4;
        const x = this.sprite.x - (width / 2);
        const y = this.sprite.y - 22; // Closer to the sprite
        const borderThickness = 1;

        // Border
        this.healthBar.fillStyle(0x000000);
        this.healthBar.fillRect(x - borderThickness, y - borderThickness, width + borderThickness * 2, height + borderThickness * 2);

        // Background (empty part)
        this.healthBar.fillStyle(0xff0000);
        this.healthBar.fillRect(x, y, width, height);

        // Foreground (health part)
        const healthPercentage = this.stats.currentHealth / this.stats.maxHealth;
        this.healthBar.fillStyle(0x00ff00);
        this.healthBar.fillRect(x, y, width * healthPercentage, height);
    }

    update() {
        // This method will be called from the main game update loop
        this.updateHealthBar();
    }

    attack(target) {
        console.log(`${this.name} attacks ${target.name}`);
        // In a real game, you'd play an attack animation here
        // this.sprite.play('knight_attack');
        target.takeDamage(this.stats.physicalDamage, this);
    }

    takeDamage(amount, attacker = null) {
        this.stats.currentHealth -= amount;
        if (this.stats.currentHealth < 0) {
            this.stats.currentHealth = 0;
        }
        this.updateHealthBar();

        // Emit particles event
        if (attacker) {
            this.scene.events.emit('unit_damaged', this.sprite.x, this.sprite.y, attacker.sprite.x, attacker.sprite.y);
        } else {
            this.scene.events.emit('unit_damaged', this.sprite.x, this.sprite.y);
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
