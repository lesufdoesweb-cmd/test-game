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
        this.apText = this.add.bitmapText(20, this.scale.height - 60, 'editundo_23', '', 55).setDepth(10002).setScale(25 / 55).setTint(0x000000);

        this.gameScene.events.on('player_turn_started', (player) => this.showActions(player), this);
        this.gameScene.events.on('player_unit_selected', (unit) => this.showActions(unit), this);
        this.gameScene.events.on('player_action_selected', this.showCancelUI, this);
        this.gameScene.events.on('player_turn_ended', this.hideAll, this);
        this.gameScene.events.on('action_cancelled', () => this.showActions(this.gameScene.activePlayerUnit), this);
        this.gameScene.events.on('player_action_completed', () => this.showActions(this.gameScene.activePlayerUnit), this);
        this.gameScene.events.on('unit_is_moving', () => this.cancelActionButton.setVisible(false), this);
        this.gameScene.events.on('unit_right_clicked', this.showUnitTooltip, this);

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

    showUnitTooltip(unit) {
        const stats = unit.getEffectiveStats();
        let content = `${unit.name} [${unit.rarity.toUpperCase()}]\n\n`;
        content += `HP: ${stats.currentHealth} / ${stats.maxHealth}\n`;
        content += `Phys DMG: ${stats.physicalDamage}\n`;
        if (stats.magicDamage > 0) {
            content += `Magic DMG: ${stats.magicDamage}\n`;
        }
        content += `Armor: ${stats.armor}\n`;
        content += `Speed: ${stats.speed}`;

        this.showCenteredTooltip(content);
        this.gameScene.input.once('pointerup', this.hideTooltip, this);
    }

    showTooltip(content, anchorX, anchorY) {
        if (this.tooltipContainer) {
            this.hideTooltip();
        }

        const padding = 24;
        const text = this.add.bitmapText(padding, padding, 'editundo_18', content, 18);
        text.setLetterSpacing(2);
        text.setMaxWidth(300);

        text.setTint(0x000000);
    
        const tooltipWidth = text.width + padding * 2;
        const tooltipHeight = text.height + padding * 2;
    
        // Using 9-slice for resizable background
        const background = this.add.nineslice(
            0, 0, 'tooltip_bg', 0, tooltipWidth, tooltipHeight, 10, 10, 10, 10
        ).setOrigin(0,0);
    
        const sceneWidth = this.scale.width;
        const sceneHeight = this.scale.height;
        let newX = anchorX - tooltipWidth;
        let newY = anchorY - tooltipHeight - 5;
    
        if (newY < 0) newY = anchorY + 5;
        if (newX < 0) newX = 0;
        if (newX + tooltipWidth > sceneWidth) newX = sceneWidth - tooltipWidth;
        if (newY + tooltipHeight > sceneHeight) newY = sceneHeight - tooltipHeight;
    
        this.tooltipContainer = this.add.container(newX, newY, [background, text]);
        this.tooltipContainer.setDepth(30000);
    }

    hideTooltip() {
        if (this.tooltipContainer) {
            this.tooltipContainer.destroy();
            this.tooltipContainer = null;
        }
        if (this.centeredTooltipContainer) {
            this.centeredTooltipContainer.destroy();
            this.centeredTooltipContainer = null;
        }
    }
    
    showCenteredTooltip(content) {
        if (this.centeredTooltipContainer) {
            this.hideTooltip();
        }
    
        const background = this.add.image(0, 0, 'bg_character_info').setOrigin(0,0);
        background.setScale(1.5);
        const tooltipWidth = background.displayWidth;
        const tooltipHeight = background.displayHeight;

        const padding = 20;
        const text = this.add.bitmapText(0, 0, 'editundo_18', content, 19); // Start at 0,0 within container
        text.setMaxWidth(tooltipWidth - (padding * 2));

        text.setLineSpacing(2);
        text.setOrigin(0.5); // Set origin to center for easier positioning
        text.setTint(0x000000);
    
        // Position text at the center of the background image, accounting for padding
        text.x = tooltipWidth / 2;
        text.y = tooltipHeight / 2;


        // Fullscreen semi-transparent blocker
        const blocker = this.add.graphics({ fillStyle: { color: 0x000000, alpha: 0.5 } })
            .fillRect(0, 0, this.scale.width, this.scale.height)
            .setInteractive(new Phaser.Geom.Rectangle(0, 0, this.scale.width, this.scale.height), Phaser.Geom.Rectangle.Contains)
            .on('pointerdown', () => this.hideTooltip());
    
        this.centeredTooltipContainer = this.add.container(
            (this.scale.width - tooltipWidth) / 2,
            (this.scale.height - tooltipHeight) / 2,
            [blocker, background, text]
        );
        // Move blocker to the container's local origin
        blocker.setPosition(-this.centeredTooltipContainer.x, -this.centeredTooltipContainer.y);
        
        this.centeredTooltipContainer.setDepth(40000);
    }

    createActionBar() {
        const slotCount = 6;
        const bgScale = 5;
        const slotSize = 10 * bgScale; // ability_bg is 16x16
        const spacing = 5;

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
        const buttonPadding = { x: 40, y: 20 }; // Internal padding for the button's content

        const buttonYPosition = this.scale.height - 16 * 6 - 10 + 30; // Moved lower

        // --- Skip Turn Button ---
        const skipTurnText = this.add.bitmapText(0, 0, 'editundo_23', 'End Turn', 23).setOrigin(0.5);

        const skipTurnButtonWidth = skipTurnText.width * (36/55) + buttonPadding.x;
        const skipTurnButtonHeight = skipTurnText.height * (36/55) + buttonPadding.y;
        const skipTurnBackground = this.add.image(0, 0, 'button_background').setOrigin(0.5);
        skipTurnBackground.displayWidth = skipTurnButtonWidth;
        skipTurnBackground.displayHeight = skipTurnButtonHeight;
        skipTurnBackground.setScale(0.3)
        
        const skipTurnButtonInitialY = buttonYPosition;
        this.skipTurnButton = this.add.container(
            this.scale.width - 200, skipTurnButtonInitialY,
            [skipTurnBackground, skipTurnText]
        );
        this.skipTurnButton.setSize(skipTurnButtonWidth, skipTurnButtonHeight);
        this.skipTurnButton.setInteractive({ useHandCursor: true });
        this.skipTurnButton.setVisible(false).setDepth(10002);

        this.skipTurnButton.on('pointerdown', () => {
            this.gameScene.events.emit('skip_turn');
        });
        this.skipTurnButton.on('pointerover', () => {
            this.tweens.add({
                targets: this.skipTurnButton,
                y: skipTurnButtonInitialY - 8,
                duration: 150,
                ease: 'Sine.easeOut'
            });
        });
        this.skipTurnButton.on('pointerout', () => {
            this.tweens.add({
                targets: this.skipTurnButton,
                y: skipTurnButtonInitialY,
                duration: 150,
                ease: 'Sine.easeIn'
            });
        });

        // --- Cancel Action Button ---
        const cancelActionText = this.add.bitmapText(0, 0, 'editundo_23', 'Cancel Action', 23).setOrigin(0.5);
        const cancelActionButtonWidth = cancelActionText.width * (36/55) + buttonPadding.x;
        const cancelActionButtonHeight = cancelActionText.height * (36/55) + buttonPadding.y;
        const cancelActionBackground = this.add.image(0, 0, 'button_background').setOrigin(0.5);

        cancelActionBackground.displayWidth = cancelActionButtonWidth;
        cancelActionBackground.displayHeight = cancelActionButtonHeight;
        cancelActionBackground.setScale(0.4);
        const cancelActionButtonInitialY = buttonYPosition; // Same as skip turn button
        this.cancelActionButton = this.add.container(
            this.scale.width - 200, cancelActionButtonInitialY, // Same x-position as skip turn button
            [cancelActionBackground, cancelActionText]
        );
        this.cancelActionButton.setSize(cancelActionButtonWidth, cancelActionButtonHeight);
        this.cancelActionButton.setInteractive({ useHandCursor: true });
        this.cancelActionButton.setVisible(false).setDepth(10002);

        this.cancelActionButton.on('pointerdown', () => {
            this.gameScene.events.emit('action_cancelled');
        });
        this.cancelActionButton.on('pointerover', () => {
            this.tweens.add({
                targets: this.cancelActionButton,
                y: cancelActionButtonInitialY - 8,
                duration: 150,
                ease: 'Sine.easeOut'
            });
        });
        this.cancelActionButton.on('pointerout', () => {
            this.tweens.add({
                targets: this.cancelActionButton,
                y: cancelActionButtonInitialY,
                duration: 150,
                ease: 'Sine.easeIn'
            });
        });
    }

    showActions(unit) {
        this.hideAbilities();
        this.cancelActionButton.setVisible(false);
        this.skipTurnButton.setVisible(true);
        this.apText.setText(`AP: ${unit.stats.currentAp}/${unit.stats.maxAp}`);

        this.abilities = unit.moves.map((move, index) => ({
            key: move.type, name: move.name, moveData: move
        }));
        for (let i = unit.moves.length; i < 6; i++) {
            this.abilities.push(null);
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
        if (move.currentCooldown > 0) isEnabled = false;
        if (move.type === 'move' && unit.hasMoved) isEnabled = false;
        if ((move.type === 'attack' || move.type === 'arrow_attack') && unit.usedStandardAction) isEnabled = false;
        if (unit.stats.currentAp < move.cost) isEnabled = false;

        const scale = 1; // Icons are 32x32, this makes them 64x64
        const icon = this.add.image(slot.x, slot.y, move.icon)
            .setDepth(10001)
            .setData('abilityKey', ability.key)
            .setScale(scale);

        // Store the initial Y position
        icon.setData('initialY', slot.y); // Use slot.y as the fixed position

        // Make icon interactive unconditionally for hover events
        icon.setInteractive({useHandCursor: true});

        // Add pointerover and pointerout for tooltip unconditionally
        icon.on('pointerover', () => {
            this.tweens.add({
                targets: icon,
                y: icon.getData('initialY') - 5, // Move up 5 pixels from initial
                duration: 100,
                ease: 'Power1',
                overwrite: true // Ensure previous tweens are stopped
            });
            const move = ability.moveData;
            let abilityText = `${move.name}\nCost: ${move.cost} AP\nRange: ${move.range}`;
            if (move.cooldown > 1) { // Only show cooldown if it's more than 1 turn
                abilityText += `\nCooldown: ${move.cooldown}`;
            }

            if (!isEnabled) {
                if (move.currentCooldown > 0) {
                    abilityText += `\n(On Cooldown: ${move.currentCooldown} turns)`;
                } else if (move.type === 'move' && unit.hasMoved) {
                    abilityText += `\n(Already moved this turn)`;
                } else if ((move.type === 'attack' || move.type === 'arrow_attack') && unit.usedStandardAction) {
                    abilityText += `\n(Used standard action)`;
                } else if (unit.stats.currentAp < move.cost) {
                    abilityText += `\n(Not enough AP)`;
                }
            }
            this.showTooltip(abilityText, icon.x, icon.y);
        });

        icon.on('pointerout', () => {
            this.tweens.add({
                targets: icon,
                y: icon.getData('initialY'), // Return to initial Y
                duration: 100,
                ease: 'Power1',
                overwrite: true // Ensure previous tweens are stopped
            });
            this.hideTooltip();
        });

        if (isEnabled) {
            this.input.setDraggable(icon);
            icon.setData('isDraggable', true);
            icon.on('pointerdown', (pointer) => {
                if (!pointer.event.button) {
                    this.hideTooltip(); // Hide tooltip immediately on click
                    this.gameScene.events.emit('action_selected', ability.moveData);
                }
            });
        } else {
            icon.setTint(0x808080);
            if (move.currentCooldown > 0) {
                const cooldownText = this.add.bitmapText(icon.x, icon.y, 'editundo_23', move.currentCooldown.toString(), 55).setOrigin(0.5, 0.5).setDepth(10002).setScale(32/55).setTint(0x000000);
                
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
        this.skipTurnButton.setVisible(false);
        this.cancelActionButton.setVisible(false);
        this.apText.setText('');
        this.abilities = [];
    }
}