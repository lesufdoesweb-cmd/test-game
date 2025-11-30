import ASSETS from '../assets.js';
import { UNIT_TYPES } from '../gameObjects/unitTypes.js';
import { UnitCard } from '../ui/UnitCard.js';
import {getBoostedStats, rarityTiers} from "../utils/rarity.js";
import {levelArmies} from "../enemy_armies/levels/index.js";

export class SquadUpgrade extends Phaser.Scene {
    constructor() {
        super('SquadUpgrade');
        this.shopCards = [];
        this.playerArmy = []; // This will hold UnitCard objects
        this.armySlots = [];
        this.isAnimating = false;

        this.rarityTiers = rarityTiers;
        this.currentDraggingCard = null; // To keep track of the card being dragged
        this.stash = []; // New array to hold cards in stash

        // Define economic constants
        this.SHOP_CARD_BUY_COST = 3;
        this.REFRESH_COST = 2;
        this.SELL_RETURN = 2;
    }

    create() {
        this.shopCards = [];
        this.armySlots = [];
        this.stashSlots = []; // Initialize stash slots

        this.createPlaceholderTextures();
        const { width, height } = this.scale;

        // --- Game State ---
        this.level = this.registry.get('level') || 1;
        this.initialPlayerArmyData = this.registry.get('playerArmy') || [];
        this.isFirstTime = this.registry.get('isFirstTime');
        this.playerGold = this.registry.get('playerGold') || 15;


        // --- Fix Duplication Bug & Initialize Army ---
        this.playerArmy = this.initialPlayerArmyData.map(savedUnitData => {
            if (savedUnitData.unit) { // if it is old structure
                return savedUnitData;
            }
            const unit = UNIT_TYPES[savedUnitData.unitName];
            const stats = getBoostedStats(unit.stats, savedUnitData.rarity);
            return { unit, rarity: savedUnitData.rarity, stats, unitName: savedUnitData.unitName };
        });
        this.stash = []; // Initialize stash
        this.stashArmyData = this.registry.get('stash') || [];
        this.stash = this.stashArmyData.map(savedUnitData => {
            if (savedUnitData.unit) { // if it is old structure
                return savedUnitData;
            }
            const unit = UNIT_TYPES[savedUnitData.unitName];
            const stats = getBoostedStats(unit.stats, savedUnitData.rarity);
            return { unit, rarity: savedUnitData.rarity, stats, unitName: savedUnitData.unitName };
        });

        this._setupUI(width, height);

        // this.unitsPurchased = 0; // This needs to be reset for each battle
        
        this.displayArmy();
        this.displayStash();
        this.checkForCombinations();
        this.updateButtonStates();
        this.updatePurchaseLimitText();
        this.updateGoldDisplay(); // Call new method to update gold display
        this.generateCards(true);
    }

    createUIButton(x, y, text, onClick) {
        const container = this.add.container(x, y);
        container.setScale(0.3);

        const background = this.add.image(0, 0, ASSETS.image.button_background.key);
        background.setScale(1);

        const label = this.add.bitmapText(0, 0, 'editundo_55', text, 55);
        label.setOrigin(0.5);

        container.add([background, label]);
        container.setSize(background.width, background.height);
        container.setInteractive({ useHandCursor: true });
        container.on('pointerdown', onClick, this);

        // --- UPDATED: Green Glow FX ---
        const glowFx = container.postFX.addGlow(0x90EE90, 0, 0, false, 0.1, 10);

        container.on('pointerover', () => {
            this.tweens.add({
                targets: container,
                y: y - 8,
                duration: 150,
                ease: 'Sine.easeOut'
            });
            this.tweens.add({
                targets: glowFx,
                outerStrength: 1.5,
                duration: 150,
                ease: 'Sine.easeOut'
            });
        });

        container.on('pointerout', () => {
            this.tweens.add({
                targets: container,
                y: y,
                duration: 150,
                ease: 'Sine.easeIn'
            });
            this.tweens.add({
                targets: glowFx,
                outerStrength: 0,
                duration: 150,
                ease: 'Sine.easeIn'
            });
        });
        return container;
    }

    _setupUI(width, height) {
        const bgImage = this.add.image(width / 2, height / 2, ASSETS.image.bg_char_selection.key);
        bgImage.setScale(Math.max(width / bgImage.width, height / bgImage.height)).setDepth(0);

        const titleText = this.isFirstTime ? 'SQUAD SELECTION' : 'SQUAD UPGRADES';
        this.purchaseLimitText = this.add.bitmapText(width / 2, 50, 'editundo_55', titleText, 28).setOrigin(0.5).setDepth(2);
        
        this.createArmySlots(width, height);
        this.createStashSlots(width, height);

        // Refresh Button
        this.refreshBtn = this.createUIButton(150, 50, 'Refresh', this.handleRefresh);
        this.refreshBtn.y = height - 50; // Position at bottom left

        // Gold Display (aligned with refresh button)
        this.goldIcon = this.add.image(this.refreshBtn.x - 50, this.refreshBtn.y, ASSETS.image.coin.key)
            .setScale(0.7)
            .setDepth(2);
        this.goldText = this.add.bitmapText(this.refreshBtn.x - 20, this.refreshBtn.y, 'editundo_23', `${this.playerGold}`, 18)
            .setOrigin(0.5)
            .setDepth(2);
        
        // Start Battle Button
        this.startBattleBtn = this.createUIButton(width - 150, 50, 'Start Battle', this.handleStartBattle);
        this.startBattleBtn.y = height - 50; // Position at bottom right

        // Sell Slot (initially hidden)
        const sellSlotX = 100;
        const sellSlotY = 220;
        this.sellSlot = this.add.group();
        const sellSlotImage = this.add.image(sellSlotX, sellSlotY, ASSETS.image.card_slot.key);
        sellSlotImage.setScale(1.5);
        sellSlotImage.setDepth(1);
        sellSlotImage.setInteractive({ dropZone: true });
        sellSlotImage.name = 'sell_slot';
        const sellText = this.add.bitmapText(sellSlotX, sellSlotY, 'editundo_55', 'Sell', 28).setOrigin(0.5).setDepth(2);
        this.sellSlot.add(sellSlotImage);
        this.sellSlot.add(sellText);
        this.sellSlot.setVisible(false);


        // Drag and Drop Event Handlers
        this.input.on('dragstart', this.handleDragStart, this);
        this.input.on('drag', this.handleDrag, this);
        this.input.on('drop', this.handleDrop, this);
        this.input.on('dragend', this.handleDragEnd, this);
    }

    createArmySlots(width, height) {
        const slotCount = 6;
        const spacing = 10; // Pixels between slots
        const cardDisplayWidth = 80 * 1.5; // UnitCard base width * scale
        const totalWidthOfCards = (slotCount * cardDisplayWidth) + ((slotCount - 1) * spacing);
        const startXArmy = (width / 2) - (totalWidthOfCards / 2) + (cardDisplayWidth / 2);
        const slotY = height - 120; // Y position for the bottom of the card

        this.armySlots = [];
        for (let i = 0; i < slotCount; i++) {
            const slotX = startXArmy + i * (cardDisplayWidth + spacing);
            const slotImage = this.add.image(slotX, slotY, ASSETS.image.card_slot.key);
            slotImage.setScale(1.5);
            slotImage.setDepth(1);
            slotImage.setInteractive({ dropZone: true });
            slotImage.name = `army_slot_${i}`; // Give it a unique name for identification
            this.armySlots.push({ x: slotX, y: slotY, unitCard: null, image: slotImage, index: i, type: 'army' });
        }
    }

    createStashSlots(width, height) {
        const slotCount = 6;
        const columns = 2;
        const rows = 3;
        const spacingX = 10;
        const spacingY = 10;
        const cardDisplayWidth = 80 * 1.5;
        const cardDisplayHeight = 120 * 1.5; // Assuming card height is 120, scaled to 1.5

        const totalWidthStash = (columns * cardDisplayWidth) + ((columns - 1) * spacingX);
        const totalHeightStash = (rows * cardDisplayHeight) + ((rows - 1) * spacingY);

        const startXStash = width - (totalWidthStash / 2) - 50; // 50px from the right edge
        const startYStash = (height / 2) - (totalHeightStash / 2); // Centered vertically

        this.stashSlots = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                const slotX = startXStash + col * (cardDisplayWidth + spacingX);
                const slotY = startYStash + row * (cardDisplayHeight + spacingY);
                const slotImage = this.add.image(slotX, slotY, ASSETS.image.card_slot.key);
                slotImage.setScale(1.5);
                slotImage.setDepth(1);
                slotImage.setInteractive({ dropZone: true });
                slotImage.name = `stash_slot_${row}_${col}`; // Unique name
                this.stashSlots.push({ x: slotX, y: slotY, unitCard: null, image: slotImage, index: (row * columns) + col, type: 'stash' });
            }
        }
    }

    generateCards(isFirstSpawn = false) {
        const unitKeys = Object.keys(UNIT_TYPES).filter(key => UNIT_TYPES[key].isPlayer);
        const startX = 100;
        const gap = 130;

        for (let i = 0; i < 3; i++) {
            const rarity = this.getRandomRarity();
            const randomUnitKey = unitKeys[Math.floor(Math.random() * unitKeys.length)];
            const unit = UNIT_TYPES[randomUnitKey];
            const stats = getBoostedStats(unit.stats, rarity);
            const cardConfig = { unit, rarity, stats, unitName: randomUnitKey, isShopCard: true }; // Added isShopCard

            if (isFirstSpawn) {
                const card = new UnitCard(this, startX + i * gap, 220, cardConfig);
                this.shopCards.push(card);
                card.playSpawnAnimation(); // Manually trigger animation
            } else {
                if (this.shopCards[i]) { // Only refresh if card exists
                    this.time.delayedCall(i * 150, () => {
                        this.shopCards[i].refreshContent(cardConfig);
                    });
                } else { // Card was purchased, create a new one, playing its spawn animation
                    const card = new UnitCard(this, startX + i * gap, 220, cardConfig);
                    this.shopCards[i] = card;
                    // Play the spawn animation for the new card
                    this.time.delayedCall(i * 150, () => {
                        card.playSpawnAnimation();
                    });
                }
            }
        }
    }

    addUnitToArmy(unitData, doCombineCheck = true) {
        if (this.playerArmy.length >= 6) {
            // Check if adding this unit would cause a combination
            const wouldCombine = this.playerArmy.filter(u => u.unitName === unitData.unitName && u.rarity === unitData.rarity).length === 2;
            if (!wouldCombine) {
                console.log("Army is full! Discard a unit first.");
                // Here you would enable a "discard mode" or show a message
                return;
            }
        }

        this.playerArmy.push(unitData);
        if (doCombineCheck) {
            this.checkForCombinations();
        }
        this.displayArmy();
    }

    displayArmy() {
        // Clear existing display
        this.armySlots.forEach(slot => {
            if (slot.unitCard) {
                slot.unitCard.destroy();
                slot.unitCard = null;
            }
        });

        // Redraw army
        this.playerArmy.forEach((unitData, i) => {
            if (i < this.armySlots.length) {
                const slot = this.armySlots[i];
                const card = new UnitCard(this, slot.x, slot.y, unitData);
                card.cardContainer.setScale(1.5);
                slot.unitCard = card;
            }
        });
    }
    
    displayStash() {
        // Clear existing display
        this.stashSlots.forEach(slot => {
            if (slot.unitCard) {
                slot.unitCard.destroy();
                slot.unitCard = null;
            }
        });

        // Redraw stash
        this.stash.forEach((unitData, i) => {
            if (i < this.stashSlots.length) {
                const slot = this.stashSlots[i];
                const card = new UnitCard(this, slot.x, slot.y, unitData);
                card.cardContainer.setScale(1.5);
                slot.unitCard = card;
            }
        });
    }

    checkForCombinations() {
        const counts = {};
        this.playerArmy.forEach(unit => {
            const key = `${unit.unitName}_${unit.rarity}`;
            counts[key] = (counts[key] || 0) + 1;
        });

        for (const key in counts) {
            if (counts[key] >= 3) {
                const [unitName, rarity] = key.split('_');
                const nextRarity = this.rarityTiers[rarity].next;

                if (nextRarity) {
                    // Remove 3 old units
                    let removed = 0;
                    this.playerArmy = this.playerArmy.filter(u => {
                        if (u.unitName === unitName && u.rarity === rarity && removed < 3) {
                            removed++;
                            return false;
                        }
                        return true;
                    });

                    // Add 1 new upgraded unit
                    const unit = UNIT_TYPES[unitName];
                    const stats = getBoostedStats(unit.stats, nextRarity);
                    const newUnitData = { unit, rarity: nextRarity, stats, unitName };
                    this.addUnitToArmy(newUnitData, false); // Add without re-checking
                    this.checkForCombinations(); // Re-run check in case of chain reactions
                    break; // Exit loop to avoid issues with modified array
                }
            }
        }
        this.displayArmy();
    }

    updatePurchaseLimitText() {
        if (this.isFirstTime) {
            const requiredUnits = 3;
            const remaining = requiredUnits - this.playerArmy.length;
            if (remaining > 0) {
                this.purchaseLimitText.setText(`Select ${remaining} more unit(s)`);
            } else {
                this.purchaseLimitText.setText('Your squad is ready for battle!');
            }
        } else {
            this.purchaseLimitText.setText('SQUAD UPGRADES');
        }
    }

    updateGoldDisplay() {
        this.goldText.setText(`${this.playerGold}`);
    }


    handleRefresh() {
        if (this.isAnimating) return;

        if (this.playerGold < this.REFRESH_COST) {
            console.log("Not enough gold to refresh!");
            return;
        }

        this.isAnimating = true;
        this.playerGold -= this.REFRESH_COST;
        this.registry.set('playerGold', this.playerGold);
        this.updateGoldDisplay();

        this.generateCards(false); // Pass false here
        this.time.delayedCall(500, () => { this.isAnimating = false; });
        this.updateButtonStates();
    }

    handleStartBattle() {
        this.registry.set('playerArmy', this.playerArmy);
        this.registry.set('stash', this.stash);
        this.registry.set('isFirstTime', false);
        this.registry.set('level', this.level);

        const enemyPool = levelArmies[this.level - 1];
        const randomEnemyArmy = enemyPool[Math.floor(Math.random() * enemyPool.length)];

        // Pass the army configuration, including rarity
        this.scene.start('Game', { playerArmy: { units: this.playerArmy }, enemyArmy: randomEnemyArmy });
    }

    updateButtonStates() {
        // Handle Refresh button
        if (this.playerGold >= this.REFRESH_COST) {
            this.refreshBtn.alpha = 1;
            this.refreshBtn.setInteractive({ useHandCursor: true });
        } else {
            this.refreshBtn.alpha = 0.5;
            this.refreshBtn.disableInteractive();
        }

        // Handle Start Battle button
        const requiredUnits = this.isFirstTime ? 3 : 0; // If first time, require 3 units, otherwise 0 for now.
        if (this.playerArmy.length >= requiredUnits) {
            this.startBattleBtn.alpha = 1;
            this.startBattleBtn.setInteractive({ useHandCursor: true });
        } else {
            this.startBattleBtn.alpha = 0.5;
            this.startBattleBtn.disableInteractive();
        }
    }

    handleDragStart(pointer, gameObject) {
        // 'gameObject' is the UnitCard's cardContainer
        this.children.bringToTop(gameObject);
        this.currentDraggingCard = gameObject; // Store reference to the container

        // Find the UnitCard instance associated with this container
        const allCards = [...this.shopCards, ...this.armySlots.map(s => s.unitCard), ...this.stashSlots.map(s => s.unitCard)].filter(c => c);
        const draggedUnitCard = allCards.find(card => card.cardContainer === gameObject);

        if (draggedUnitCard) {
            // Store original position to revert if drop is invalid
            draggedUnitCard.originalX = gameObject.x;
            draggedUnitCard.originalY = gameObject.y;

            if (!draggedUnitCard.isShopCard) {
                this.sellSlot.setVisible(true);
            }
        }
    }

    handleDrag(pointer, gameObject, dragX, dragY) {
        gameObject.x = dragX;
        gameObject.y = dragY;
    }

    handleDrop(pointer, gameObject, dropZone) {
        // 'gameObject' is the UnitCard's cardContainer (the dragged item)
        // 'dropZone' is the image of the slot (the drop target)

        const draggedUnitCard = this.shopCards.find(card => card && card.cardContainer === gameObject) ||
                               this.armySlots.find(slot => slot.unitCard && slot.unitCard.cardContainer === gameObject)?.unitCard ||
                               this.stashSlots.find(slot => slot.unitCard && slot.unitCard.cardContainer === gameObject)?.unitCard;

        if (!draggedUnitCard) {
            console.log("Dragged object is not a UnitCard.");
            return;
        }

        if (dropZone.name === 'sell_slot') {
            this.playerGold += this.SELL_RETURN;
            this.registry.set('playerGold', this.playerGold);
            this.updateGoldDisplay();
            this.updateButtonStates();

            const originalSlot = this.armySlots.find(slot => slot.unitCard === draggedUnitCard) ||
                                 this.stashSlots.find(slot => slot.unitCard === draggedUnitCard);
            if (originalSlot) {
                originalSlot.unitCard = null;
            }
            draggedUnitCard.destroy();
            return; // Exit after selling
        }


        // Find the slot object (from armySlots or stashSlots) that corresponds to the dropZone image
        const targetSlot = this.armySlots.find(slot => slot.image === dropZone) ||
                           this.stashSlots.find(slot => slot.image === dropZone);

        if (!targetSlot) {
            console.log("Dropped on an invalid drop zone.");
            // Revert card to original position
            gameObject.x = draggedUnitCard.originalX;
            gameObject.y = draggedUnitCard.originalY;
            return;
        }

        // Check if the target slot is empty
        if (targetSlot.unitCard !== null) {
            console.log("Target slot is already occupied.");
            // Revert card to original position
            gameObject.x = draggedUnitCard.originalX;
            gameObject.y = draggedUnitCard.originalY;
            return;
        }

        // Logic for purchasing/moving card
        if (draggedUnitCard.isShopCard) { // Card from shop
            // This is a new card from the shop
            if (this.playerGold >= this.SHOP_CARD_BUY_COST) {
                this.playerGold -= this.SHOP_CARD_BUY_COST;
                this.registry.set('playerGold', this.playerGold);
                this.updateGoldDisplay();

                // Move card to new slot
                targetSlot.unitCard = draggedUnitCard;
                draggedUnitCard.cardContainer.x = targetSlot.x;
                draggedUnitCard.cardContainer.y = targetSlot.y;
                draggedUnitCard.isShopCard = false; // It's no longer a shop card

                // Remove from shopCards array and generate a new one
                const shopCardIndex = this.shopCards.findIndex(card => card === draggedUnitCard);
                if (shopCardIndex !== -1) {
                    this.shopCards[shopCardIndex] = null; // Mark as null, will be replaced on refresh
                }
                this.updateButtonStates();
            } else {
                console.log("Not enough gold to buy this unit!");
                // Revert card to original position
                gameObject.x = draggedUnitCard.originalX;
                gameObject.y = draggedUnitCard.originalY;
            }
        } else {
            // Card is from army or stash, just moving it
            // Remove from original slot
            const originalSlot = this.armySlots.find(slot => slot.unitCard === draggedUnitCard) ||
                                 this.stashSlots.find(slot => slot.unitCard === draggedUnitCard);
            if (originalSlot) {
                originalSlot.unitCard = null;
            }

            // Place in new slot
            targetSlot.unitCard = draggedUnitCard;
            draggedUnitCard.cardContainer.x = targetSlot.x;
            draggedUnitCard.cardContainer.y = targetSlot.y;
        }

        this.updateArmyAndStashData(); // Save changes
        this.displayArmy();
        this.displayStash();
        this.checkForCombinations();
    }

    handleDragEnd(pointer, gameObject, dropped) {
        // 'gameObject' is the UnitCard's cardContainer
        this.sellSlot.setVisible(false); // Always hide sell slot on drag end

        if (!dropped && this.currentDraggingCard) {
            // If the card was not dropped on a valid target, revert its position
            const draggedUnitCard = this.shopCards.find(card => card && card.cardContainer === this.currentDraggingCard) ||
                                   this.armySlots.find(slot => slot.unitCard && slot.unitCard.cardContainer === this.currentDraggingCard)?.unitCard ||
                                   this.stashSlots.find(slot => slot.unitCard && slot.unitCard.cardContainer === this.currentDraggingCard)?.unitCard;
            if (draggedUnitCard) {
                gameObject.x = draggedUnitCard.originalX;
                gameObject.y = draggedUnitCard.originalY;
            }
        }
        this.currentDraggingCard = null;
    }

    updateArmyAndStashData() {
        // Update playerArmy
        this.playerArmy = this.armySlots.filter(slot => slot.unitCard !== null)
            .map(slot => slot.unitCard.config);
        this.registry.set('playerArmy', this.playerArmy);

        // Update stash
        this.stash = this.stashSlots.filter(slot => slot.unitCard !== null)
            .map(slot => slot.unitCard.config);
        this.registry.set('stash', this.stash);
    }

    displayStash() {
        // Clear existing display
        this.stashSlots.forEach(slot => {
            if (slot.unitCard) {
                slot.unitCard.destroy();
                slot.unitCard = null;
            }
        });

        // Redraw stash
        this.stash.forEach((unitData, i) => {
            if (i < this.stashSlots.length) {
                const slot = this.stashSlots[i];
                const card = new UnitCard(this, slot.x, slot.y, unitData);
                card.cardContainer.setScale(1.5);
                slot.unitCard = card;
            }
        });
    }

    // --- Utility Functions (mostly unchanged) ---

    createPlaceholderTextures() {
        if (!this.textures.exists('dust_particle')) {
            this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xffffff, 1).fillRect(0, 0, 8, 8).generateTexture('dust_particle', 8, 8);
        }
        if (!this.textures.exists('glow_particle')) {
            this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xffffff, 1).fillRect(0, 0, 10, 10).generateTexture('glow_particle', 10, 10);
        }
    }

    getRandomRarity() {
        const rarities = [
            { name: 'common', weight: 60 },
            { name: 'rare', weight: 25 },
            { name: 'epic', weight: 10 },
            { name: 'legendary', weight: 5 },
        ];
        const totalWeight = rarities.reduce((acc, rarity) => acc + rarity.weight, 0);
        let random = Math.random() * totalWeight;
        for (const rarity of rarities) {
            if (random < rarity.weight) return rarity.name;
            random -= rarity.weight;
        }
        return 'common';
    }

}