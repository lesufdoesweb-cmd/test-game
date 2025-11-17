import ASSETS from "../assets.js";
import { Tooltip } from "../ui/Tooltip.js";

export class ActionUI extends Phaser.Scene {
    constructor() {
        super('ActionUI');
        this.slots = [];
        this.abilities = [];
        this.cooldownTexts = [];
        this.draggingKey = null;
        this.skipTurnButton = null;
        this.cancelActionButton = null;
        this.apText = null;
        this.actionBar = null;
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
        this.gameScene.events.on('player_action_completed', () => this.showActions(this.gameScene.player), this);

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
            // we don't need visual feedback for the drop zone with the new bar
        });

        this.input.on('dragleave', (pointer, gameObject, dropZone) => {
            // we don't need visual feedback for the drop zone with the new bar
        });

        this.input.on('drop', (pointer, gameObject, dropZone) => {
            if (!this.draggingKey || !dropZone.getData('isSlot')) {
                this.resetAbilityPosition(gameObject.getData('abilityKey'));
                return;
            }

            const droppedOnSlotIndex = dropZone.getData('slotIndex');
            const draggedFromSlotIndex = this.abilities.findIndex(a => a && a.key === this.draggingKey);

            const temp = this.abilities[droppedOnSlotIndex];
            this.abilities[droppedOnSlotIndex] = this.abilities[draggedFromSlotIndex];
            this.abilities[draggedFromSlotIndex] = temp;

            this.refreshActionBar(this.gameScene.player);
        });

        this.input.on('dragend', (pointer, gameObject) => {
            if (this.draggingKey) {
                this.resetAbilityPosition(gameObject.getData('abilityKey'));
            }
            this.draggingKey = null;
        });
    }

    createActionBar() {
        const scale = 3;
        const barHeight = 16 * scale;
        const barX = this.scale.width / 2;
        const barY = this.scale.height - barHeight / 2 - 5;
        this.actionBar = this.add.image(barX, barY, ASSETS.image.ability_bar.key).setOrigin(0.5, 0.5).setDepth(9999).setScale(scale);

        const squareSize = 12;
        const startX = 13;
        const spacing = 3;
        const barImageWidth = 115;

        const firstSlotX = barX - (barImageWidth / 2) * scale + (startX + squareSize / 2) * scale;

        for (let i = 0; i < 6; i++) {
            const slotX = firstSlotX + i * (squareSize + spacing) * scale;
            const slotY = barY;
            const slot = this.add.zone(slotX, slotY, squareSize * scale, squareSize * scale).setRectangleDropZone(squareSize * scale, squareSize * scale);
            slot.setData('isSlot', true);
            slot.setData('slotIndex', i);
            this.slots.push({ x: slotX, y: slotY, dropZone: slot });
        }
    }

    createButtons() {
        const barTopY = this.scale.height - 16 * 3 - 5;
        this.skipTurnButton = this.add.text(this.scale.width - 100, barTopY - 30, 'End Turn', {
            fontSize: '18px', backgroundColor: '#333', padding: { x: 10, y: 5 }
        }).setInteractive({ useHandCursor: true }).setOrigin(0.5).setVisible(false).setDepth(10002);

        this.skipTurnButton.on('pointerdown', () => {
            this.gameScene.events.emit('skip_turn');
        });

        this.cancelActionButton = this.add.text(this.scale.width / 2, barTopY - 30, 'Cancel Action', {
            fontSize: '18px', backgroundColor: '#800', padding: { x: 10, y: 5 }
        }).setInteractive({ useHandCursor: true }).setOrigin(0.5).setVisible(false).setDepth(10002);

        this.cancelActionButton.on('pointerdown', () => {
            this.gameScene.events.emit('action_cancelled');
        });
    }

    showActions(unit) {
        this.hideAbilities();
        this.actionBar.setVisible(true);
        this.cancelActionButton.setVisible(false);
        this.skipTurnButton.setVisible(true);
        this.apText.setText(`AP: ${unit.stats.currentAp}/${unit.stats.maxAp}`);

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
        this.actionBar.setVisible(false);
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
        if (move.currentCooldown > 0) isEnabled = false;
        if (move.type === 'move' && unit.hasMoved) isEnabled = false;
        if ((move.type === 'attack' || move.type === 'long_attack') && unit.usedStandardAction) isEnabled = false;
        if (unit.stats.currentAp < move.cost) isEnabled = false;

        let frame = -1;
        if (move.type === 'attack') frame = 0;
        if (move.type === 'long_attack') frame = 2;
        if (move.type === 'move') frame = 7;

        const scale = 3;
        const icon = this.add.sprite(slot.x - (1 * scale), slot.y + (3 * scale), ASSETS.spritesheet.ability_atlas.key, frame)
            .setDepth(10001)
            .setData('abilityKey', ability.key)
            .setScale(scale);

        if (isEnabled) {
            icon.setInteractive({useHandCursor: true});
            this.input.setDraggable(icon);
            icon.setData('isDraggable', true);
            icon.on('pointerdown', (pointer) => {
                if (!pointer.event.button) {
                    this.gameScene.events.emit('action_selected', ability.moveData);
                }
            });

            icon.on('pointerover', () => {
                const playerStatsUI = this.scene.get('PlayerStatsUI');
                if (!playerStatsUI) return;

                const move = ability.moveData;
                const abilityText = `${move.name}\nCost: ${move.cost} AP\nRange: ${move.range}\nCooldown: ${move.cooldown}`;
                
                playerStatsUI.showAbilityTooltip(abilityText, icon.x, icon.y, icon.displayWidth, icon.displayHeight);
            });
    
            icon.on('pointerout', () => {
                const playerStatsUI = this.scene.get('PlayerStatsUI');
                if (!playerStatsUI) return;
                playerStatsUI.hideAbilityTooltip();
            });

        } else {
            icon.setTint(0x808080);
            if (move.currentCooldown > 0) {
                const cooldownText = this.add.text(icon.x, icon.y, move.currentCooldown, {
                    fontSize: '16px',
                    fill: '#fff',
                    stroke: '#000',
                    strokeThickness: 4
                }).setOrigin(0.5, 0.5).setDepth(10002);
                
                // Add the text to a temporary list to be cleaned up
                if (!this.cooldownTexts) this.cooldownTexts = [];
                this.cooldownTexts.push(cooldownText);
            }
        }

        ability.gameObject = icon;
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
        this.cooldownTexts.forEach(text => text.destroy());
        this.cooldownTexts = [];
    }

    hideAll() {
        this.hideAbilities();
        if (this.actionBar) this.actionBar.setVisible(false);
        this.skipTurnButton.setVisible(false);
        this.cancelActionButton.setVisible(false);
        this.apText.setText('');
        this.abilities = [];
    }
}
