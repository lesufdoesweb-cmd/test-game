export class ActionUI extends Phaser.Scene {
    constructor() {
        super('ActionUI');
        this.slots = [];
        this.abilities = [];
        this.draggingKey = null;
        this.skipTurnButton = null;
        this.cancelActionButton = null;
        this.apText = null;
    }

    create() {
        this.gameScene = this.scene.get('Game');

        this.createActionBar();
        this.createButtons();
        this.apText = this.add.text(10, this.scale.height - 30, '', { fontSize: '24px', fill: '#fff' }).setDepth(10002);

        this.gameScene.events.on('player_turn_started', (player) => this.showActions(player), this);
        this.gameScene.events.on('player_action_selected', this.showCancelUI, this);
        this.gameScene.events.on('player_turn_ended', this.hideAll, this);
        this.gameScene.events.on('action_cancelled', () => this.showActions(this.gameScene.player), this);

        this.input.on('dragstart', (pointer, gameObject) => {
            if (!gameObject.getData('isDraggable')) return;
            this.draggingKey = gameObject.getData('abilityKey');
            this.children.bringToTop(gameObject);
        });

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (!this.draggingKey) return;
            gameObject.x = dragX;
            gameObject.y = dragY;
        });

        this.input.on('dragover', (pointer, gameObject, dropZone) => {
            if (dropZone.getData('isSlot')) dropZone.setFillStyle(0x444444);
        });

        this.input.on('dragleave', (pointer, gameObject, dropZone) => {
            if (dropZone.getData('isSlot')) dropZone.setFillStyle(0x222222);
        });

        this.input.on('drop', (pointer, gameObject, dropZone) => {
            if (!this.draggingKey || !dropZone.getData('isSlot')) {
                this.resetAbilityPosition(gameObject.getData('abilityKey'));
                if (dropZone.getData('isSlot')) dropZone.setFillStyle(0x222222);
                return;
            }

            const droppedOnSlotIndex = dropZone.getData('slotIndex');
            const draggedFromSlotIndex = this.abilities.findIndex(a => a && a.key === this.draggingKey);

            const temp = this.abilities[droppedOnSlotIndex];
            this.abilities[droppedOnSlotIndex] = this.abilities[draggedFromSlotIndex];
            this.abilities[draggedFromSlotIndex] = temp;

            this.refreshActionBar(this.gameScene.player);
            dropZone.setFillStyle(0x222222);
        });

        this.input.on('dragend', (pointer, gameObject) => {
            if (this.draggingKey) {
                this.resetAbilityPosition(gameObject.getData('abilityKey'));
            }
            this.draggingKey = null;
        });
    }

    createActionBar() {
        const barWidth = 6 * 64 + 5 * 10;
        const barHeight = 64 + 20;
        const barX = this.scale.width / 2 - barWidth / 2;
        const barY = this.scale.height - barHeight - 10;

        const background = this.add.graphics();
        background.fillStyle(0x111111, 0.8);
        background.fillRoundedRect(barX, barY, barWidth, barHeight, 10);
        background.setDepth(9999);

        for (let i = 0; i < 6; i++) {
            const slotX = barX + 10 + i * (64 + 10) + 32;
            const slotY = barY + 10 + 32;
            const slot = this.add.rectangle(slotX, slotY, 64, 64, 0x222222).setInteractive().setDepth(10000);
            slot.setData('isSlot', true);
            slot.setData('slotIndex', i);
            slot.input.dropZone = true;
            this.slots.push(slot);
        }
    }

    createButtons() {
        this.skipTurnButton = this.add.text(this.scale.width - 100, this.scale.height - 50, 'End Turn', {
            fontSize: '18px', backgroundColor: '#333', padding: { x: 10, y: 5 }
        }).setInteractive({ useHandCursor: true }).setOrigin(0.5).setVisible(false).setDepth(10002);

        this.skipTurnButton.on('pointerdown', () => {
            this.gameScene.events.emit('skip_turn');
        });

        this.cancelActionButton = this.add.text(this.scale.width / 2, this.scale.height - 50, 'Cancel Action', {
            fontSize: '18px', backgroundColor: '#800', padding: { x: 10, y: 5 }
        }).setInteractive({ useHandCursor: true }).setOrigin(0.5).setVisible(false).setDepth(10002);

        this.cancelActionButton.on('pointerdown', () => {
            this.gameScene.events.emit('action_cancelled');
        });
    }

    showActions(unit) {
        this.hideAbilities();
        this.cancelActionButton.setVisible(false);
        this.skipTurnButton.setVisible(true);
        this.apText.setText(`AP: ${unit.stats.currentAp}/${unit.stats.maxAp}`);

        // Only initialize abilities if they are not set, to preserve order
        if (this.abilities.length === 0) {
            this.abilities = unit.moves.map((move, index) => ({
                key: move.type, name: move.name, moveData: move
            }));
            for (let i = unit.moves.length; i < 6; i++) {
                this.abilities.push(null);
            }
        }

        this.refreshActionBar(unit);
    }

    showCancelUI() {
        this.hideAbilities();
        this.skipTurnButton.setVisible(false);
        this.cancelActionButton.setVisible(true);
    }

    refreshActionBar(unit) {
        this.hideAbilities();
        this.abilities.forEach((ability, index) => {
            if (ability) this.createAbilityIcon(ability, index, unit);
        });
    }

    createAbilityIcon(ability, slotIndex, unit) {
        const slot = this.slots[slotIndex];
        if (!slot) return;

        const move = ability.moveData;
        let isEnabled = true;
        if (move.type === 'move' && unit.hasMoved) isEnabled = false;
        if (move.type === 'attack' && unit.usedStandardAction) isEnabled = false;
        if (unit.stats.currentAp < move.cost) isEnabled = false;

        const container = this.add.container(slot.x, slot.y).setDepth(10001)
            .setData('abilityKey', ability.key);

        const iconBg = this.add.rectangle(0, 0, 60, 60, isEnabled ? 0x555555 : 0x222222);
        const iconText = this.add.text(0, 0, ability.name, { fontSize: '14px' }).setOrigin(0.5);
        const costText = this.add.text(25, -25, `${move.cost}AP`, { fontSize: '12px', fill: '#ff0' }).setOrigin(0.5);

        container.add([iconBg, iconText, costText]);

        if (isEnabled) {
            container.setInteractive(new Phaser.Geom.Rectangle(-32, -32, 64, 64), Phaser.Geom.Rectangle.Contains);
            this.input.setDraggable(container);
            container.setData('isDraggable', true);
            container.on('pointerdown', (pointer) => {
                if (!pointer.event.button) {
                    this.gameScene.events.emit('action_selected', ability.moveData);
                }
            });
        } else {
            iconText.setAlpha(0.5);
            costText.setAlpha(0.5);
        }

        ability.gameObject = container;
    }

    resetAbilityPosition(abilityKey) {
        const ability = this.abilities.find(a => a && a.key === abilityKey);
        const originalSlotIndex = this.abilities.findIndex(a => a && a.key === abilityKey);

        if (ability && ability.gameObject && originalSlotIndex !== -1) {
            const slot = this.slots[originalSlotIndex];
            this.tweens.add({
                targets: ability.gameObject, x: slot.x, y: slot.y, duration: 150, ease: 'Power2'
            });
        }
    }

    hideAbilities() {
        this.abilities.forEach(ability => {
            if (ability && ability.gameObject) {
                ability.gameObject.destroy();
                ability.gameObject = null;
            }
        });
    }

    hideAll() {
        this.hideAbilities();
        this.skipTurnButton.setVisible(false);
        this.cancelActionButton.setVisible(false);
        this.apText.setText('');
        this.abilities = [];
    }
}