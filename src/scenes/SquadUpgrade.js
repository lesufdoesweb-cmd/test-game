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
        this.unitsPurchased = 0;

        this.rarityTiers = rarityTiers;
    }

    create() {
        this.shopCards = [];
        this.armySlots = [];

        this.createPlaceholderTextures();
        const { width, height } = this.scale;

        // --- Game State ---
        this.level = this.registry.get('level') || 1;
        this.initialPlayerArmyData = this.registry.get('playerArmy') || [];
        this.isFirstTime = this.registry.get('isFirstTime');
        this.shopRefreshes = this.registry.get('shopRefreshes');

        // --- Fix Duplication Bug & Initialize Army ---
        this.playerArmy = this.initialPlayerArmyData.map(savedUnitData => {
            const unit = UNIT_TYPES[savedUnitData.unitName];
            const stats = getBoostedStats(unit.stats, savedUnitData.rarity);
            return { unit, rarity: savedUnitData.rarity, stats, unitName: savedUnitData.unitName };
        });
        this.unitsPurchased = 0;

        // --- UI ---
        const bgImage = this.add.image(width / 2, height / 2, ASSETS.image.bg_char_selection.key);
        bgImage.setScale(Math.max(width / bgImage.width, height / bgImage.height)).setDepth(0);

        const titleText = this.isFirstTime ? 'SQUAD SELECTION' : 'SQUAD UPGRADES';
        this.purchaseLimitText = this.add.bitmapText(width / 2, 50, 'editundo_55', titleText, 28).setOrigin(0.5).setDepth(2);
        
        this.createArmySlots(width, height);

        this.refreshBtn = this.createUIButton(150, 50, 'Refresh', this.handleRefresh);
        this.startBattleBtn = this.createUIButton(width - 150, 50, 'Start Battle', this.handleStartBattle);

        this.refreshText = this.add.bitmapText(this.refreshBtn.x, this.refreshBtn.y + 30, 'editundo_23', `Refreshes: ${this.shopRefreshes}`, 18).setOrigin(0.5);
        

        this.displayArmy();
        this.checkForCombinations();
        this.updateButtonStates();
        this.updatePurchaseLimitText();
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

    createArmySlots(width, height) {
        const slotCount = 6;
        const slotWidth = 100;
        const startX = (width - (slotCount * slotWidth)) / 2 + slotWidth/2;
        for (let i = 0; i < slotCount; i++) {
            const slotX = startX + i * slotWidth;
            const slotY = height - 120;
            this.armySlots.push({ x: slotX, y: slotY, unitCard: null });
        }
    }

    generateCards(isFirstSpawn = false) {
        const unitKeys = Object.keys(UNIT_TYPES).filter(key => UNIT_TYPES[key].isPlayer);
        const startX = 200;
        const gap = 280;

        for (let i = 0; i < 3; i++) {
            const rarity = this.getRandomRarity();
            const randomUnitKey = unitKeys[Math.floor(Math.random() * unitKeys.length)];
            const unit = UNIT_TYPES[randomUnitKey];
            const stats = getBoostedStats(unit.stats, rarity);
            const cardConfig = { unit, rarity, stats, unitName: randomUnitKey };

            if (isFirstSpawn) {
                const card = new UnitCard(this, startX + i * gap, 220, cardConfig);
                card.cardContainer.on('pointerdown', () => this.onCardSelected(card, i));
                this.shopCards.push(card);
                card.playSpawnAnimation(); // Manually trigger animation
            } else {
                if (this.shopCards[i]) { // Only refresh if card exists
                    this.time.delayedCall(i * 150, () => {
                        this.shopCards[i].refreshContent(cardConfig);
                    });
                } else { // Card was purchased, create a new one, playing its spawn animation
                    const card = new UnitCard(this, startX + i * gap, 220, cardConfig);
                    card.cardContainer.on('pointerdown', () => this.onCardSelected(card, i));
                    this.shopCards[i] = card;
                    // Play the spawn animation for the new card
                    this.time.delayedCall(i * 150, () => {
                        card.playSpawnAnimation();
                    });
                }
            }
        }
    }

    onCardSelected(card, index) {
        if (this.isFirstTime) {
            if (this.unitsPurchased >= 3) {
                console.log("You can only have 3 units for your initial squad.");
                return;
            }
        } else { // Not first time
            if (this.unitsPurchased >= 1) {
                console.log("You can only purchase 1 unit between battles.");
                return;
            }
        }

        this.unitsPurchased++;
        this.addUnitToArmy(card.config);
        card.destroy();
        this.shopCards[index] = null; // Mark as purchased
        this.updateButtonStates();
        this.updatePurchaseLimitText();
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
                card.cardContainer.setScale(2); // Make them smaller for the slots
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
            const remaining = requiredUnits - this.unitsPurchased;
            if (remaining > 0) {
                this.purchaseLimitText.setText(`Select ${remaining} more unit(s)`);
            } else {
                this.purchaseLimitText.setText('Your squad is ready for battle!');
            }
        } else {
            this.purchaseLimitText.setText('SQUAD UPGRADES');
        }
    }


    handleRefresh() {
        if (this.shopRefreshes > 0 && !this.isAnimating) {
            this.isAnimating = true;
            this.shopRefreshes--;
            this.registry.set('shopRefreshes', this.shopRefreshes);
            this.refreshText.setText(`Refreshes: ${this.shopRefreshes}`);
            this.generateCards(false); // Pass false here
            this.time.delayedCall(500, () => { this.isAnimating = false; });
            this.updateButtonStates();
        }
    }

    handleStartBattle() {
        const armyToSave = this.playerArmy.map(u => ({ unitName: u.unitName, rarity: u.rarity }));
        this.registry.set('playerArmy', armyToSave);
        this.registry.set('isFirstTime', false);
        this.registry.set('level', this.level);

        const enemyPool = levelArmies[this.level - 1];
        const randomEnemyArmy = enemyPool[Math.floor(Math.random() * enemyPool.length)];

        // Pass the army configuration, including rarity
        this.scene.start('Game', { playerArmy: { units: armyToSave }, enemyArmy: randomEnemyArmy });
    }

    updateButtonStates() {
        // Handle Refresh button
        if (this.shopRefreshes > 0) {
            this.refreshBtn.alpha = 1;
            this.refreshBtn.setInteractive({ useHandCursor: true });
        } else {
            this.refreshBtn.alpha = 0.5;
            this.refreshBtn.disableInteractive();
        }

        const requiredUnits = this.isFirstTime ? 3 : 0;
        if ((this.isFirstTime && this.unitsPurchased >= requiredUnits) || (!this.isFirstTime && this.playerArmy.length >= requiredUnits)) {
            this.startBattleBtn.alpha = 1;
            this.startBattleBtn.setInteractive({ useHandCursor: true });
        } else {
            this.startBattleBtn.alpha = 0.5;
            this.startBattleBtn.disableInteractive();
        }
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