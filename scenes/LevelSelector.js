export class LevelSelector extends Phaser.Scene {
    constructor() {
        super('LevelSelector');
    }

    async create() {
        const { width, height } = this.scale;

        this.add.text(width / 2, 50, 'Select a Level', {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'Pixelify-Sans'
        }).setOrigin(0.5);

        const levelFiles = [
            '../levels/level_2_config.js',
            '../levels/level1_config.js',
            '../levels/test_config.js',
            '../levels/The First Step 2_config.js'
        ];

        const levelConfigs = [];
        for (const file of levelFiles) {
            try {
                const module = await import(file);
                const configKey = Object.keys(module).find(key => key.endsWith('Config'));
                if (configKey) {
                    levelConfigs.push(module[configKey]);
                }
            } catch (e) {
                console.error(`Failed to load level: ${file}`, e);
            }
        }

        let yPos = 150;
        levelConfigs.forEach(config => {
            // Level Name Button
            const levelButton = this.add.text(width / 2 - 50, yPos, config.name, {
                fontSize: '24px',
                fill: '#0f0',
                fontFamily: 'Pixelify-Sans'
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

            levelButton.on('pointerdown', () => {
                this.scene.start('Game', { levelConfig: config });
            });
            levelButton.on('pointerover', () => levelButton.setStyle({ fill: '#ff0'}));
            levelButton.on('pointerout', () => levelButton.setStyle({ fill: '#0f0'}));

            // Edit Button
            const editButton = this.add.text(width / 2 + 100, yPos, 'Edit', {
                fontSize: '20px',
                fill: '#f0f',
                fontFamily: 'Pixelify-Sans'
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

            editButton.on('pointerdown', () => {
                this.scene.start('LevelEditor', { levelConfig: config });
            });
            editButton.on('pointerover', () => editButton.setStyle({ fill: '#ff0'}));
            editButton.on('pointerout', () => editButton.setStyle({ fill: '#f0f'}));


            yPos += 50;
        });

        const backButton = this.add.text(width - 100, height - 50, 'Back', {
            fontSize: '24px',
            fill: '#f00',
            fontFamily: 'Pixelify-Sans'
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        backButton.on('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }
}