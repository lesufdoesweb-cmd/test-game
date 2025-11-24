export class PlayerStatsUI extends Phaser.Scene {
    constructor() {
        super('PlayerStatsUI');
        this.statsText = null;
        this.gameScene = null; // Reference to the Game scene
    }

    create() {
        this.gameScene = this.scene.get('Game');

        // A semi-transparent background for the stats
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.4);
        bg.fillRoundedRect(20, 20, 400, 200, 16);
        bg.setScrollFactor(0);

        this.statsText = this.add.bitmapText(40, 40, 'editundo_55', '', 55);
        this.statsText.setLineSpacing(12);
        this.statsText.setScale(32 / 55);
        this.statsText.setScrollFactor(0); // Fix it to the camera

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
}
