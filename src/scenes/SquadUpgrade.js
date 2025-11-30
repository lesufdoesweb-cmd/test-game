import ASSETS from '../assets.js';
import { UNIT_TYPES } from '../gameObjects/unitTypes.js';
import { UnitCard } from '../ui/UnitCard.js';
import { getBoostedStats, rarityTiers } from "../utils/rarity.js";
import { levelArmies } from "../enemy_armies/levels/index.js";

export class SquadUpgrade extends Phaser.Scene {
    constructor() {
        super('SquadUpgrade');
        this.shopCards = [null, null, null];
        this.armySlots = [];
        this.stashSlots = [];
        this.isAnimating = false;

        this.rarityTiers = rarityTiers;
        this.currentDraggingCard = null;

        // Define economic constants
        this.SHOP_CARD_BUY_COST = 3;
        this.REFRESH_COST = 2;
        this.SELL_RETURN = 2;

        // Visual Constants
        this.ARMY_SCALE = 1.5;
        this.STASH_SCALE = 0.9;
    }

    create() {
        this.shopCards = [null, null, null];
        this.armySlots = [];
        this.stashSlots = [];

        this.createPlaceholderTextures();
        const { width, height } = this.scale;

        // --- Game State ---
        this.level = this.registry.get('level') || 1;
        this.initialPlayerArmyData = this.registry.get('playerArmy') || [];
        this.stashArmyData = this.registry.get('stash') || [];
        this.isFirstTime = this.registry.get('isFirstTime');
        this.playerGold = this.registry.get('playerGold') !== undefined ? this.registry.get('playerGold') : 15;

        this._setupUI(width, height);

        this.initializeExistingUnits();

        this.updateButtonStates();
        this.updatePurchaseLimitText();
        this.updateGoldDisplay();
        this.generateCards(true);
    }

    initializeExistingUnits() {
        // 1. Setup Army
        this.initialPlayerArmyData.forEach((savedUnitData, index) => {
            if (index < this.armySlots.length) {
                const unitData = this._normalizeUnitData(savedUnitData);
                const slot = this.armySlots[index];
                this.createCardInSlot(slot, unitData);
            }
        });

        // 2. Setup Stash
        this.stashArmyData.forEach((savedUnitData, index) => {
            if (index < this.stashSlots.length) {
                const unitData = this._normalizeUnitData(savedUnitData);
                const slot = this.stashSlots[index];
                this.createCardInSlot(slot, unitData);
            }
        });
    }

    _normalizeUnitData(savedUnitData) {
        if (savedUnitData.unit) return savedUnitData;
        const unit = UNIT_TYPES[savedUnitData.unitName];
        const stats = getBoostedStats(unit.stats, savedUnitData.rarity);
        return { unit, rarity: savedUnitData.rarity, stats, unitName: savedUnitData.unitName };
    }

    _setupUI(width, height) {
        // Background
        const bgImage = this.add.image(width / 2, height / 2, ASSETS.image.bg_char_selection.key);
        bgImage.setScale(Math.max(width / bgImage.width, height / bgImage.height)).setDepth(0);

        // --- TOP UI ---
        // Refresh Button (Top Left)
        this.refreshBtn = this.createUIButton(100, 60, 'Refresh', this.handleRefresh);

        // Gold Display (Top Left, next to Refresh)
        this.goldIcon = this.add.image(this.refreshBtn.x + 100, 60, ASSETS.image.coin.key).setScale(0.7).setDepth(2);
        this.goldText = this.add.bitmapText(this.goldIcon.x + 30, 60, 'editundo_23', `${this.playerGold}`, 24).setOrigin(0, 0.5).setDepth(2);

        // Start Battle Button (Top Right)
        this.startBattleBtn = this.createUIButton(width - 150, 60, 'Start Battle', this.handleStartBattle);

        // Title Text (Center, slightly lower)
        const titleText = this.isFirstTime ? 'SQUAD SELECTION' : 'SQUAD UPGRADES';
        this.purchaseLimitText = this.add.bitmapText(width / 2, 100, 'editundo_55', titleText, 28).setOrigin(0.5).setDepth(2);

        // --- SLOTS LAYOUT ---
        this.createArmySlots(width, height);
        this.createStashSlots(width, height);

        // --- Sell Zone (Above Shop Cards) ---
        // Placed around Y=180, above the shop cards
        this.createSellZone(width, 180);

        // Drag Handlers
        this.input.on('dragstart', this.handleDragStart, this);
        this.input.on('drag', this.handleDrag, this);
        this.input.on('drop', this.handleDrop, this);
        this.input.on('dragend', this.handleDragEnd, this);
    }

    createSellZone(width, yPos) {
        this.sellSlot = this.add.container(width / 2, yPos);

        const bg = this.add.image(0, 0, ASSETS.image.button_background.key).setScale(1.5, 0.8).setTint(0xcc6666);
        const label = this.add.bitmapText(0, -10, 'editundo_55', `SELL FOR ${this.SELL_RETURN}`, 24).setOrigin(0.5);
        const icon = this.add.image(0, 15, ASSETS.image.coin.key).setScale(0.6);

        const zone = this.add.zone(0, 0, 200, 80).setRectangleDropZone(200, 80);
        zone.name = 'sell_slot';

        this.sellSlot.add([bg, label, icon, zone]);
        this.sellSlot.setVisible(false);
        this.sellSlot.setDepth(1);
    }

    createArmySlots(width, height) {
        this.add.bitmapText(width / 2, height - 200, 'editundo_55', 'ACTIVE SQUAD', 20).setOrigin(0.5).setTint(0xaaaaaa);

        const slotCount = 6;
        const spacing = 15;
        const cardWidth = 80 * this.ARMY_SCALE;
        const totalWidth = (slotCount * cardWidth) + ((slotCount - 1) * spacing);
        const startX = (width / 2) - (totalWidth / 2) + (cardWidth / 2);
        const slotY = height - 110;

        for (let i = 0; i < slotCount; i++) {
            const slotX = startX + i * (cardWidth + spacing);
            const slotImage = this.add.image(slotX, slotY, ASSETS.image.card_slot.key);
            slotImage.setScale(this.ARMY_SCALE);
            slotImage.setInteractive({ dropZone: true });
            slotImage.name = `army_slot_${i}`;

            this.armySlots.push({
                x: slotX,
                y: slotY,
                unitCard: null,
                image: slotImage,
                index: i,
                type: 'army',
                scale: this.ARMY_SCALE
            });
        }
    }

    createStashSlots(width, height) {
        // "Reserves" text
        const labelX = width - 120;

        const columns = 2;
        const rows = 3;
        const spacingX = 10;
        const spacingY = 10;
        const cardWidth = 80 * this.STASH_SCALE;
        const cardHeight = 120 * this.STASH_SCALE;

        const totalW = (columns * cardWidth) + ((columns - 1) * spacingX);
        const totalH = (rows * cardHeight) + ((rows - 1) * spacingY);

        // Lower position: Instead of centered, push towards bottom
        // Align bottom of stash with top of army label area? Or just lower than center.
        const startX = labelX;
        const startY = (height / 2) + 50; // Pushed down by 50px from center

        this.add.bitmapText(labelX, startY - (totalH/2) - 30, 'editundo_55', 'RESERVES', 20).setOrigin(0.5).setTint(0xaaaaaa);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                const slotX = (startX - (totalW/2) + (cardWidth/2)) + col * (cardWidth + spacingX);
                const slotY = (startY - (totalH/2) + (cardHeight/2)) + row * (cardHeight + spacingY);

                const slotImage = this.add.image(slotX, slotY, ASSETS.image.card_slot.key);
                slotImage.setScale(this.STASH_SCALE);
                slotImage.setInteractive({ dropZone: true });
                slotImage.name = `stash_slot_${row}_${col}`;

                this.stashSlots.push({
                    x: slotX,
                    y: slotY,
                    unitCard: null,
                    image: slotImage,
                    index: (row * columns) + col,
                    type: 'stash',
                    scale: this.STASH_SCALE
                });
            }
        }
    }

    createCardInSlot(slot, config) {
        if (slot.unitCard) {
            slot.unitCard.destroy();
        }

        // Ensure we pass 'this' as the scene
        const card = new UnitCard(this, slot.x, slot.y, config);

        // Safety check for method existence
        if (typeof card.setCardScale === 'function') {
            card.setCardScale(slot.scale);
        } else {
            console.error("setCardScale missing on unit card!", card);
            card.cardContainer.setScale(slot.scale); // Fallback
        }

        slot.unitCard = card;
        return card;
    }

    // --- Interaction Logic ---

    handleDragStart(pointer, gameObject) {
        this.children.bringToTop(gameObject);
        this.currentDraggingCard = gameObject;

        const cardInstance = this.getCardFromContainer(gameObject);

        if (cardInstance) {
            cardInstance.originalX = gameObject.x;
            cardInstance.originalY = gameObject.y;

            if (!cardInstance.isShopCard) {
                this.sellSlot.setVisible(true);
            }
        }
    }

    handleDrag(pointer, gameObject, dragX, dragY) {
        gameObject.x = dragX;
        gameObject.y = dragY;
    }

    handleDrop(pointer, gameObject, dropZone) {
        const draggedCard = this.getCardFromContainer(gameObject);
        if (!draggedCard) return;

        // 1. Sell Zone
        if (dropZone.name === 'sell_slot' && !draggedCard.isShopCard) {
            this.handleSellAction(draggedCard);
            return;
        }

        // 2. Identify Target Slot
        const targetSlot = [...this.armySlots, ...this.stashSlots].find(slot => slot.image === dropZone);

        if (!targetSlot) {
            this.revertDrag(gameObject, draggedCard);
            return;
        }

        // 3. Buying
        if (draggedCard.isShopCard) {
            if (targetSlot.unitCard) {
                console.log("Slot occupied.");
                this.revertDrag(gameObject, draggedCard);
            } else if (this.playerGold >= this.SHOP_CARD_BUY_COST) {
                this.handleBuyAction(draggedCard, targetSlot);
            } else {
                console.log("Not enough gold.");
                this.revertDrag(gameObject, draggedCard);
            }
            return;
        }

        // 4. Moving
        const sourceSlot = [...this.armySlots, ...this.stashSlots].find(slot => slot.unitCard === draggedCard);

        if (sourceSlot === targetSlot) {
            this.revertDrag(gameObject, draggedCard);
            return;
        }

        if (targetSlot.unitCard === null) {
            this.moveCard(sourceSlot, targetSlot, draggedCard);
        } else {
            // Swap logic could go here, for now revert
            this.revertDrag(gameObject, draggedCard);
        }
    }

    handleSellAction(card) {
        this.playerGold += this.SELL_RETURN;
        this.updateGoldDisplay();

        const sourceSlot = [...this.armySlots, ...this.stashSlots].find(slot => slot.unitCard === card);
        if (sourceSlot) sourceSlot.unitCard = null;

        this.sellSlot.setVisible(false);
        this.updateButtonStates();

        // FIX: Destroy next frame to avoid input errors
        this.time.delayedCall(0, () => {
            card.destroy();
        });

        this.updateRegistryData();
    }

    handleBuyAction(shopCard, targetSlot) {
        this.playerGold -= this.SHOP_CARD_BUY_COST;
        this.updateGoldDisplay();

        const newConfig = { ...shopCard.config, isShopCard: false };
        this.createCardInSlot(targetSlot, newConfig);

        const shopIndex = this.shopCards.indexOf(shopCard);
        if (shopIndex !== -1) {
            this.shopCards[shopIndex] = null;
        }

        // FIX: Destroy next frame to avoid input errors
        this.time.delayedCall(0, () => {
            shopCard.destroy();
        });

        this.checkForCombinations();
        this.updateButtonStates();
        this.updateRegistryData();
    }

    moveCard(sourceSlot, targetSlot, card) {
        sourceSlot.unitCard = null;
        targetSlot.unitCard = card;

        card.cardContainer.x = targetSlot.x;
        card.cardContainer.y = targetSlot.y;

        // Update scale using method
        if (typeof card.setCardScale === 'function') {
            card.setCardScale(targetSlot.scale);
        }

        this.checkForCombinations();
        this.updateButtonStates();
        this.updateRegistryData();
    }

    revertDrag(gameObject, card) {
        this.tweens.add({
            targets: gameObject,
            x: card.originalX,
            y: card.originalY,
            duration: 200,
            ease: 'Sine.out'
        });
    }

    handleDragEnd(pointer, gameObject, dropped) {
        this.sellSlot.setVisible(false);
        this.currentDraggingCard = null;

        if (!dropped) {
            const card = this.getCardFromContainer(gameObject);
            if(card) this.revertDrag(gameObject, card);
        }
    }

    getCardFromContainer(container) {
        let card = this.shopCards.find(c => c && c.cardContainer === container);
        if (card) return card;

        [...this.armySlots, ...this.stashSlots].forEach(slot => {
            if (slot.unitCard && slot.unitCard.cardContainer === container) {
                card = slot.unitCard;
            }
        });
        return card;
    }

    checkForCombinations() {
        const allSlots = [...this.armySlots, ...this.stashSlots];
        const unitsMap = {};

        allSlots.forEach(slot => {
            if (slot.unitCard) {
                const u = slot.unitCard.config;
                const key = `${u.unitName}_${u.rarity}`;
                if (!unitsMap[key]) unitsMap[key] = [];
                unitsMap[key].push(slot);
            }
        });

        for (const key in unitsMap) {
            if (unitsMap[key].length >= 3) {
                const slotsToMerge = unitsMap[key].slice(0, 3);
                const firstSlot = slotsToMerge[0];

                const { unitName, rarity } = firstSlot.unitCard.config;
                const nextRarity = this.rarityTiers[rarity].next;

                if (nextRarity) {
                    console.log(`Merging 3 ${rarity} ${unitName} into 1 ${nextRarity}`);

                    const unit = UNIT_TYPES[unitName];
                    const stats = getBoostedStats(unit.stats, nextRarity);
                    const newConfig = { unit, rarity: nextRarity, stats, unitName };

                    slotsToMerge.forEach(slot => {
                        // Destroy next frame
                        const card = slot.unitCard;
                        slot.unitCard = null;
                        if(card) {
                            this.time.delayedCall(0, () => card.destroy());
                        }
                    });

                    // Create upgraded card after delay to allow destroy to clear
                    this.time.delayedCall(50, () => {
                        this.createCardInSlot(firstSlot, newConfig);
                        this.sound.play('select_sound');
                        this.checkForCombinations();
                    });

                    return;
                }
            }
        }

        this.updateRegistryData();
    }

    updateRegistryData() {
        const armyData = this.armySlots.map(s => s.unitCard ? s.unitCard.config : null).filter(c => c !== null);
        const stashData = this.stashSlots.map(s => s.unitCard ? s.unitCard.config : null).filter(c => c !== null);

        this.registry.set('playerArmy', armyData);
        this.registry.set('stash', stashData);
    }

    generateCards(isFirstSpawn = false) {
        const unitKeys = Object.keys(UNIT_TYPES).filter(key => UNIT_TYPES[key].isPlayer);
        const startX = 100;
        const gap = 130;
        const yPos = 260; // Lowered significantly

        for (let i = 0; i < 3; i++) {
            if (this.shopCards[i] === null) {
                const rarity = this.getRandomRarity();
                const randomUnitKey = unitKeys[Math.floor(Math.random() * unitKeys.length)];
                const unit = UNIT_TYPES[randomUnitKey];
                const stats = getBoostedStats(unit.stats, rarity);

                const cardConfig = { unit, rarity, stats, unitName: randomUnitKey, isShopCard: true };

                const card = new UnitCard(this, startX + i * gap, yPos, cardConfig);
                this.shopCards[i] = card;

                if (isFirstSpawn) {
                    card.playSpawnAnimation();
                } else {
                    this.time.delayedCall(i * 100, () => card.playSpawnAnimation());
                }
            }
        }
    }

    handleRefresh() {
        if (this.isAnimating) return;
        if (this.playerGold < this.REFRESH_COST) return;

        this.playerGold -= this.REFRESH_COST;
        this.updateGoldDisplay();
        this.isAnimating = true;

        this.shopCards.forEach(card => {
            if (card) card.destroy();
        });
        this.shopCards = [null, null, null];

        this.generateCards(false);
        this.time.delayedCall(500, () => { this.isAnimating = false; });
        this.updateButtonStates();
    }

    updateButtonStates() {
        if (this.playerGold >= this.REFRESH_COST) {
            this.refreshBtn.alpha = 1;
            this.refreshBtn.setInteractive({ useHandCursor: true });
        } else {
            this.refreshBtn.alpha = 0.5;
            this.refreshBtn.disableInteractive();
        }

        const armyCount = this.armySlots.filter(s => s.unitCard).length;
        const requiredUnits = this.isFirstTime ? 3 : 1;

        if (armyCount >= requiredUnits) {
            this.startBattleBtn.alpha = 1;
            this.startBattleBtn.setInteractive({ useHandCursor: true });
        } else {
            this.startBattleBtn.alpha = 0.5;
            this.startBattleBtn.disableInteractive();
        }

        this.updatePurchaseLimitText();
    }

    updatePurchaseLimitText() {
        const armyCount = this.armySlots.filter(s => s.unitCard).length;
        if (this.isFirstTime) {
            const requiredUnits = 3;
            const remaining = requiredUnits - armyCount;
            if (remaining > 0) {
                this.purchaseLimitText.setText(`Select ${remaining} more unit(s)`);
            } else {
                this.purchaseLimitText.setText('Your squad is ready!');
            }
        } else {
            this.purchaseLimitText.setText('SQUAD UPGRADES');
        }
    }

    updateGoldDisplay() {
        this.goldText.setText(`${this.playerGold}`);
        this.registry.set('playerGold', this.playerGold);
    }

    handleStartBattle() {
        this.updateRegistryData();
        this.registry.set('isFirstTime', false);
        this.registry.set('level', this.level);

        const enemyPool = levelArmies[this.level - 1] || levelArmies[0];
        const randomEnemyArmy = enemyPool[Math.floor(Math.random() * enemyPool.length)];

        // Get fresh data from slots to ensure sync
        const currentArmy = this.armySlots.map(s => s.unitCard ? s.unitCard.config : null).filter(c => c !== null);

        this.scene.start('Game', { playerArmy: { units: currentArmy }, enemyArmy: randomEnemyArmy });
    }

    createUIButton(x, y, text, onClick) {
        const container = this.add.container(x, y);
        container.setScale(0.3);

        const background = this.add.image(0, 0, ASSETS.image.button_background.key);
        const label = this.add.bitmapText(0, 0, 'editundo_55', text, 55).setOrigin(0.5);

        container.add([background, label]);
        container.setSize(background.width, background.height);
        container.setInteractive({ useHandCursor: true });
        container.on('pointerdown', onClick, this);

        const glowFx = container.postFX.addGlow(0x90EE90, 0, 0, false, 0.1, 10);

        container.on('pointerover', () => {
            this.tweens.add({ targets: container, y: y - 8, duration: 150, ease: 'Sine.easeOut' });
            this.tweens.add({ targets: glowFx, outerStrength: 1.5, duration: 150 });
        });

        container.on('pointerout', () => {
            this.tweens.add({ targets: container, y: y, duration: 150, ease: 'Sine.easeIn' });
            this.tweens.add({ targets: glowFx, outerStrength: 0, duration: 150 });
        });
        return container;
    }

    createPlaceholderTextures() {
        if (!this.textures.exists('dust_particle')) {
            this.make.graphics({ add: false }).fillStyle(0xffffff, 1).fillRect(0, 0, 8, 8).generateTexture('dust_particle', 8, 8);
        }
    }

    getRandomRarity() {
        const rarities = [
            { name: 'common', weight: 60 },
            { name: 'rare', weight: 25 },
            { name: 'epic', weight: 10 },
            { name: 'legendary', weight: 5 },
        ];
        const totalWeight = rarities.reduce((acc, r) => acc + r.weight, 0);
        let random = Math.random() * totalWeight;
        for (const rarity of rarities) {
            if (random < rarity.weight) return rarity.name;
            random -= rarity.weight;
        }
        return 'common';
    }
}