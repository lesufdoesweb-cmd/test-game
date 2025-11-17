import { Tooltip } from '../ui/Tooltip.js';

export class PlayerStatsUI extends Phaser.Scene {
    constructor() {
        super('PlayerStatsUI');
        this.statsText = null;
        this.tooltip = null;
        this.gameScene = null; // Reference to the Game scene
    }

    create() {
        this.gameScene = this.scene.get('Game');

        // A semi-transparent background for the stats
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.4);
        bg.fillRoundedRect(10, 10, 200, 100, 8);
        bg.setScrollFactor(0);

        this.statsText = this.add.text(20, 20, '', {
            fontSize: '16px',
            fill: '#ffffff',
            lineSpacing: 6
        });
        this.statsText.setScrollFactor(0); // Fix it to the camera

        this.tooltip = new Tooltip(this, 0, 0); // Tooltip is created in this UI scene

        // Listen for stats changes
        this.gameScene.events.on('player_stats_changed', this.updateStats, this);

        // Initial update
        if (this.gameScene.player) {
            this.updateStats(this.gameScene.player);
        }
    }

    updateStats(player) {
        if (player && player.stats && this.statsText) {
            const stats = player.stats;
            this.statsText.setText(
`Name: ${player.name}
HP: ${stats.currentHealth} / ${stats.maxHealth}
AP: ${stats.currentAp} / ${stats.maxAp}
DMG: ${stats.physicalDamage}`
            );
        }
    }

    // Methods for Game scene to show/hide tooltips for world objects
    showGameTooltip(content, worldX, worldY, worldWidth, worldHeight) {
        const cam = this.gameScene.cameras.main;

        // Calculate anchor point in world coordinates (top-right of the object)
        const worldAnchorX = worldX + worldWidth / 2;
        const worldAnchorY = worldY - worldHeight / 2;

        // Convert world anchor to screen coordinates relative to this UI scene
        const screenX = (worldAnchorX - cam.worldView.x) * cam.zoom;
        const screenY = (worldAnchorY - cam.worldView.y) * cam.zoom;

        this.tooltip.showAt(content, screenX, screenY);
    }

    hideGameTooltip() {
        this.tooltip.hide();
    }

    // Methods for ActionUI scene to show/hide tooltips for UI elements
    showAbilityTooltip(content, screenX, screenY, screenWidth, screenHeight) {
        // screenX, screenY are already relative to the ActionUI scene, which is unscaled
        // Calculate anchor point (top-right of the element)
        const anchorX = screenX + screenWidth / 2;
        const anchorY = screenY - screenHeight / 2;
        this.tooltip.showAt(content, anchorX, anchorY);
    }

    hideAbilityTooltip() {
        this.tooltip.hide();
    }
}
