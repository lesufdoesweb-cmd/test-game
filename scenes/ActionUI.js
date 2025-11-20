import ASSETS from "../assets.js";

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
        this.tooltipContainer = null;
    }

    create() {
        this.gameScene = this.scene.get('Game');

        this.createActionBar();
        this.createButtons();
        this.apText = this.add.text(20, this.scale.height - 60, '', { fontSize: '48px', fill: '#fff', fontFamily: 'Pixelify-Sans' }).setDepth(10002);

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

    showTooltip(content, anchorX, anchorY) {
        if (this.tooltipContainer) {
            this.hideTooltip();
        }

        const textObject = this.add.text(0, 0, content, {
            fontSize: '28px',
            fill: '#fff',
            wordWrap: { width: 300 },
            fontFamily: 'Pixelify-Sans'
        });

        const padding = 16;
        const textWidth = textObject.width;
        const textHeight = textObject.height;
        const tooltipWidth = textWidth + padding * 2;
        const tooltipHeight = textHeight + padding * 2;

        textObject.setPosition(padding, padding);

        const background = this.add.graphics();
        background.fillStyle(0x111111, 0.9);
        background.fillRoundedRect(0, 0, tooltipWidth, tooltipHeight, 5);
        background.lineStyle(1, 0xeeeeee, 0.9);
        background.strokeRoundedRect(0, 0, tooltipWidth, tooltipHeight, 5);

        const sceneWidth = this.scale.width;
        const sceneHeight = this.scale.height;
        let newX = anchorX - tooltipWidth;
        let newY = anchorY - tooltipHeight - 5;

        if (newY < 0) {
            newY = anchorY + 5;
        }
        if (newX < 0) {
            newX = 0;
        }
        if (newY + tooltipHeight > sceneHeight) {
            newY = sceneHeight - tooltipHeight;
        }

        this.tooltipContainer = this.add.container(newX, newY);
        this.tooltipContainer.add([background, textObject]);
        this.tooltipContainer.setDepth(30000);
    }

    hideTooltip() {
        if (this.tooltipContainer) {
            this.tooltipContainer.destroy();
            this.tooltipContainer = null;
        }
    }
    
    showGameTooltip(content, worldX, worldY, worldWidth, worldHeight) {
        const cam = this.gameScene.cameras.main;
        const screenX = (worldX - cam.worldView.x) * cam.zoom;
        const screenY = (worldY - cam.worldView.y) * cam.zoom;
        this.showTooltip(content, screenX, screenY);
    }

    hideGameTooltip() {
        this.hideTooltip();
    }

    createActionBar() {
        const slotCount = 6;
        const bgScale = 5;
        const slotSize = 16 * bgScale; // ability_bg is 16x16
        const spacing = 30;

        const totalWidth = slotCount * slotSize + (slotCount - 1) * spacing;
        const startX = (this.scale.width - totalWidth) / 2;
        const slotY = this.scale.height - (slotSize / 2) - 20;

        for (let i = 0; i < slotCount; i++) {
            const slotX = startX + i * (slotSize + spacing) + (slotSize / 2);
            const slot = this.add.zone(slotX, slotY, slotSize, slotSize).setRectangleDropZone(slotSize, slotSize);
            slot.setData('isSlot', true);
            slot.setData('slotIndex', i);
            this.slots.push({ x: slotX, y: slotY, dropZone: slot });
        }
    }

    createButtons() {
        const barTopY = this.scale.height - 16 * 6 - 10;
        this.skipTurnButton = this.add.text(this.scale.width - 200, barTopY - 60, 'End Turn', {
            fontSize: '36px', backgroundColor: '#333', padding: { x: 20, y: 10 }, fontFamily: 'Pixelify-Sans'
        }).setInteractive({ useHandCursor: true }).setOrigin(0.5).setVisible(false).setDepth(10002);

        this.skipTurnButton.on('pointerdown', () => {
            this.gameScene.events.emit('skip_turn');
        });

        this.cancelActionButton = this.add.text(this.scale.width / 2, barTopY - 60, 'Cancel Action', {
            fontSize: '36px', backgroundColor: '#800', padding: { x: 20, y: 10 }, fontFamily: 'Pixelify-Sans'
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

        const bgScale = 0.8;
        const bg = this.add.image(slot.x, slot.y, ASSETS.image.ability_bg.key)
            .setScale(bgScale)
            .setDepth(10000);

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

        const scale = 8;
        const icon = this.add.sprite(slot.x - 12, slot.y - 12, ASSETS.spritesheet.ability_atlas.key, frame)
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
                this.tweens.add({
                    targets: [icon, bg],
                    y: '-=5', // Move up 5 pixels
                    duration: 100,
                    ease: 'Power1'
                });
                bg.setTint(0xffd700);
                const move = ability.moveData;
                const abilityText = `${move.name}\nCost: ${move.cost} AP\nRange: ${move.range}\nCooldown: ${move.cooldown}`;
                this.showTooltip(abilityText, icon.x, icon.y);
            });
    
            icon.on('pointerout', () => {
                this.tweens.add({
                    targets: [icon, bg],
                    y: '+=5', // Move back down 5 pixels
                    duration: 100,
                    ease: 'Power1'
                });
                bg.clearTint();
                this.hideTooltip();
            });

        } else {
            icon.setTint(0x808080);
            if (move.currentCooldown > 0) {
                const cooldownText = this.add.text(icon.x, icon.y, move.currentCooldown, {
                    fontSize: '32px',
                    fill: '#fff',
                    stroke: '#000',
                    strokeThickness: 4,
                    fontFamily: 'Pixelify-Sans'
                }).setOrigin(0.5, 0.5).setDepth(10002);
                
                if (!this.cooldownTexts) this.cooldownTexts = [];
                this.cooldownTexts.push(cooldownText);
            }
        }

        ability.gameObject = icon;
        ability.background = bg;
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
            if (ability && ability.background) {
                ability.background.destroy();
                ability.background = null;
            }
        });
        this.cooldownTexts.forEach(text => text.destroy());
        this.cooldownTexts = [];
    }

    hideAll() {
        this.hideAbilities();
        this.skipTurnButton.setVisible(false);
        this.cancelActionButton.setVisible(false);
        this.apText.setText('');
        this.abilities = [];
    }
}