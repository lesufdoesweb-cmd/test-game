import ASSETS from '../assets.js';
import { UNIT_TYPES } from '../gameObjects/unitTypes.js';
import { RecruitUnitCard } from './RecruitUnitCard.js';

export class RecruitPopup extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        this.scene = scene;
        const { width, height } = scene.scale;

        this.setDepth(1000);
        this.setVisible(false);

        // Constants for Layout
        this.VIEWPORT_WIDTH = 500;
        this.VIEWPORT_HEIGHT = 300; // Visible height for cards
        this.CARD_WIDTH = 80 * 1;
        this.CARD_HEIGHT = 120 * 1;
        this.SPACING = 15;

        // Grey overlay
        this.overlay = scene.add.graphics({ fillStyle: { color: 0x000000, alpha: 0.7 } });
        this.overlay.fillRect(0, 0, width, height);
        this.overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains); // Block clicks below
        this.add(this.overlay);

        // Popup background
        this.popupBg = scene.add.image(width / 2, height / 2, 'modal_recruits');
        this.popupBg.setScale(1.7);
        this.add(this.popupBg);

        const banner = this.scene.add.image(width / 2, this.popupBg.y - (this.popupBg.height * 1.7) / 2 - 60, 'banner_recruit_screen');
        banner.setScale(1.5);
        this.add(banner);

        this.scene.tweens.add({
            targets: banner,
            y: banner.y - 3,
            duration: 500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Calculate positioning relative to BG
        const bgTop = this.popupBg.y - (this.popupBg.height * 1.7) / 2;
        const bgLeft = this.popupBg.x - (this.popupBg.width * 1.7) / 2;

        // Title - REMOVED
        // this.title = scene.add.bitmapText(width / 2, bgTop + 60, 'editundo_55', 'RECRUIT', 28).setOrigin(0.5);
        // this.add(this.title);

        // Close button
        this.closeButton = scene.add.image(this.popupBg.x + (this.popupBg.width * 1.7)/2 - 40, bgTop + 40, 'x_button')
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.hide());
        this.add(this.closeButton);

        // Beer currency display
        this.beerContainer = this.createBeerDisplay(width / 2, bgTop + 60);
        this.add(this.beerContainer);

        // Container for scrolling cards
        this.cardsContainer = this.scene.add.container(0, 0);
        this.add(this.cardsContainer);

        // Button (Initially hidden/disabled logic handled in update)
        this.confirmButton = this.createUIButton(width / 2, this.popupBg.y + (this.popupBg.height * 1.7)/2 - 60, 'SELECT', () => this.onConfirmClick());
        this.add(this.confirmButton);

        // Initialize State
        this.selectedCard = null;
        this.unitCards = [];

        // Setup Grid
        this.createUnitCards();
        this.setupScrolling();
        this.updateButtonState(); // Set initial button state

        scene.add.existing(this);
    }

    createUnitCards() {
        // Clear existing if any
        this.unitCards.forEach(c => c.destroy());
        this.unitCards = [];
        this.cardsContainer.removeAll(true);

        const playerUnits = Object.keys(UNIT_TYPES).filter(key => UNIT_TYPES[key].isPlayer);
        const unlockedUnits = this.scene.registry.get('unlockedUnits') || ['Archer', 'Knight']; // Default unlocked

        // Sort: Unlocked first, then Locked
        const sortedPlayerUnits = playerUnits.sort((a, b) => {
            const aLocked = !unlockedUnits.includes(a);
            const bLocked = !unlockedUnits.includes(b);
            if (aLocked && !bLocked) return 1;
            if (!aLocked && bLocked) return -1;
            return 0;
        });

        const columns = 3;

        // Calculate Grid Position
        // Center the grid within the viewport width
        const totalRowWidth = (columns * this.CARD_WIDTH) + ((columns - 1) * this.SPACING);
        const startX = this.popupBg.x - (totalRowWidth / 2) + (this.CARD_WIDTH / 2);
        const startY = this.popupBg.y - 80; // Starting Y position for the first row

        let col = 0;
        let row = 0;

        for (const unitKey of sortedPlayerUnits) {
            const unit = UNIT_TYPES[unitKey];
            const isLocked = !unlockedUnits.includes(unitKey);

            const cardX = startX + col * (this.CARD_WIDTH + this.SPACING);
            const cardY = startY + row * (this.CARD_HEIGHT + this.SPACING);

            const card = new RecruitUnitCard(this.scene, cardX, cardY, {
                unit: unit,
                rarity: unit.rarity,
                stats: unit.stats,
                unitName: unitKey,
                isLocked: isLocked,
                stars: 1,
            });

            this.cardsContainer.add(card.cardContainer);
            this.unitCards.push(card);

            // Listen for selection
            card.cardContainer.on('cardSelected', () => this.handleCardSelected(card));

            col++;
            if (col >= columns) {
                col = 0;
                row++;
            }
        }

        // IMPORTANT: Calculate the actual height of the content inside the container
        const totalRows = Math.ceil(sortedPlayerUnits.length / columns);
        this.contentHeight = totalRows * (this.CARD_HEIGHT + this.SPACING);

        // We set the size of the container to help with debugging/logic, though Phaser containers don't auto-clip
        this.cardsContainer.setSize(this.VIEWPORT_WIDTH, this.contentHeight);
    }

    setupScrolling() {
        // 1. Create Mask
        // The mask defines the visible window.
        // We position it relative to where we want the "view" to be.
        const maskX = this.popupBg.x - this.VIEWPORT_WIDTH / 2;
        const maskY = this.popupBg.y - 120; // Adjust this to move the window up/down

        const maskGraphics = this.scene.make.graphics();
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillRect(maskX, maskY, this.VIEWPORT_WIDTH, this.VIEWPORT_HEIGHT + 50);

        const mask = maskGraphics.createGeometryMask();
        this.cardsContainer.setMask(mask);

        // 2. Scrollbar Track
        const trackX = this.popupBg.x + 220; // To the right of the cards
        const trackY = maskY;
        const trackHeight = this.VIEWPORT_HEIGHT + 50;

        this.scrollTrack = this.scene.add.graphics({fillStyle: {color: 0x4d2c1d}});
        this.scrollTrack.fillRect(trackX, trackY, 10, trackHeight);
        this.add(this.scrollTrack);

        // 3. Scrollbar Thumb
        this.scrollbar = this.scene.add.graphics({fillStyle: {color: 0x86593f}});
        this.scrollbar.fillRect(0, 0, 14, 50);
        this.scrollbar.x = trackX - 2;
        this.scrollbar.y = trackY;
        this.add(this.scrollbar);

        this.scrollbar.setInteractive(new Phaser.Geom.Rectangle(0, 0, 14, 50), Phaser.Geom.Rectangle.Contains);
        this.scene.input.setDraggable(this.scrollbar);

        // Store scroll limits
        this.minScrollY = 0; // The cards start at 0 offset
        // Max scroll is how much the content overflows the viewport
        this.maxScrollY = Math.max(0, this.contentHeight - (this.VIEWPORT_HEIGHT + 50) + 50); // +50 for padding at bottom

        this.initialContainerY = 0; // We will offset the container from its creation point

        // 4. Input Handling
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (!this.visible) return;

            // Calculate new Y based on scroll
            const currentY = this.cardsContainer.y;
            const targetY = Phaser.Math.Clamp(currentY - deltaY * 0.5, -this.maxScrollY, 0);

            this.cardsContainer.y = targetY;
            this.updateScrollbarPosition(trackY, trackHeight);
        });

        this.scrollbar.on('drag', (pointer, dragX, dragY) => {
            // Clamp thumb position
            this.scrollbar.y = Phaser.Math.Clamp(dragY, trackY, trackY + trackHeight - 50);

            // Calculate percentage
            const percentage = (this.scrollbar.y - trackY) / (trackHeight - 50);

            // Update container
            this.cardsContainer.y = -percentage * this.maxScrollY;
        });
    }

    updateScrollbarPosition(trackY, trackHeight) {
        if (this.maxScrollY <= 0) return;
        const percentage = Math.abs(this.cardsContainer.y) / this.maxScrollY;
        this.scrollbar.y = trackY + (percentage * (trackHeight - 50));
    }

    handleCardSelected(card) {
        if (this.selectedCard) {
            this.selectedCard.deselect();
        }

        if (this.selectedCard === card) {
            // Deselecting current
            this.selectedCard = null;
        } else {
            // Selecting new
            this.selectedCard = card;
            this.selectedCard.select(); // Visual selection
        }

        this.updateButtonState();
    }

    updateButtonState() {
        if (!this.selectedCard) {
            this.confirmButton.alpha = 0.5;
            this.updateButtonText("SELECT");
            return;
        }

        if (this.selectedCard.isLocked) {
            const playerBeers = this.scene.registry.get('playerBeers') || 0;
            const unlockCost = 3;

            this.updateButtonText(`UNLOCK (${unlockCost})`);

            if (playerBeers >= unlockCost) {
                this.confirmButton.alpha = 1;
            } else {
                this.confirmButton.alpha = 0.5; // Not enough beer
            }
        } else {
            this.updateButtonText("RECRUITED"); // Or whatever action intended for unlocked units
            this.confirmButton.alpha = 0.5; // Assuming we can't do anything with recruited units here
        }
    }

    onConfirmClick() {
        if (!this.selectedCard) return;

        // Unlock Logic
        if (this.selectedCard.isLocked) {
            const playerBeers = this.scene.registry.get('playerBeers') || 0;
            const unlockCost = 3;

            if (playerBeers >= unlockCost) {
                // Deduct
                this.scene.registry.set('playerBeers', playerBeers - unlockCost);
                this.updateBeerDisplay();

                // Unlock
                const unlockedUnits = this.scene.registry.get('unlockedUnits') || [];
                unlockedUnits.push(this.selectedCard.config.unitName);
                this.scene.registry.set('unlockedUnits', unlockedUnits);

                // Update UI
                this.selectedCard.unlock();
                this.updateButtonState(); // Re-evaluate button state

                // Optional: Flash success or particle effect
                this.scene.cameras.main.flash(200, 255, 255, 255);
            }
        }
    }

    updateButtonText(text) {
        // Helper to find the text object inside the button container
        const label = this.confirmButton.list.find(c => c.type === 'BitmapText');
        if (label) label.setText(text);
    }

    createBeerDisplay(x, y) {
        const container = this.scene.add.container(x,y);
        const background = this.scene.add.image(0,0, 'button_background').setScale(0.4);
        const beerIcon = this.scene.add.image(-45, 0, 'beer_icon').setScale(1.5);
        const beerAmount = this.scene.registry.get('playerBeers') || 0;
        this.beerText = this.scene.add.bitmapText(10, 0, 'editundo_23', `${beerAmount}`, 24).setOrigin(0.5);

        container.add([background, beerIcon, this.beerText]);
        return container;
    }

    updateBeerDisplay() {
        const beerAmount = this.scene.registry.get('playerBeers') || 0;
        this.beerText.setText(`${beerAmount}`);
    }

    createUIButton(x, y, text, onClick) {
        const container = this.scene.add.container(x, y);
        container.setScale(0.3);

        const background = this.scene.add.image(0, 0, ASSETS.image.button_background.key);
        const label = this.scene.add.bitmapText(0, 0, 'editundo_55', text, 55).setOrigin(0.5);

        container.add([background, label]);
        container.setSize(background.width, background.height);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerdown', () => {
            if (container.alpha === 1) onClick();
        });

        const glowFx = container.postFX.addGlow(0x90EE90, 0, 0, false, 0.1, 10);

        container.on('pointerover', () => {
            if (container.alpha === 1) {
                this.scene.tweens.add({ targets: container, y: y - 8, duration: 150, ease: 'Sine.easeOut' });
                this.scene.tweens.add({ targets: glowFx, outerStrength: 1.5, duration: 150 });
            }
        });

        container.on('pointerout', () => {
            this.scene.tweens.add({ targets: container, y: y, duration: 150, ease: 'Sine.easeIn' });
            this.scene.tweens.add({ targets: glowFx, outerStrength: 0, duration: 150 });
        });
        return container;
    }


    show() {
        this.setVisible(true);
        this.updateBeerDisplay();
        this.updateButtonState();

        // Reset scroll on open
        this.cardsContainer.y = 0;
        if(this.scrollbar) this.updateScrollbarPosition(this.popupBg.y - 120, this.VIEWPORT_HEIGHT);
    }

    hide() {
        this.setVisible(false);
        this.emit('popupClosed');
    }
}