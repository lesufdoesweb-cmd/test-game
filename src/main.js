
import { Game } from './scenes/Game.js';
import { TimelineUI } from "./scenes/TimelineUI.js";
import { ActionUI } from "./scenes/ActionUI.js";
import { Preloader } from "./scenes/Preloader.js";
import { GameOver } from "./scenes/GameOver.js";
import { Background } from "./scenes/Background.js";
import { MainMenu } from "./scenes/MainMenu.js";
import { NewMainMenu } from "./scenes/NewMainMenu.js";
import { SquadUpgrade } from "./scenes/SquadUpgrade.js";

const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    backgroundColor: '#00000000', // Transparent black
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [Preloader, Background, Game, TimelineUI, ActionUI, GameOver, MainMenu, NewMainMenu, SquadUpgrade],
    render: {
        pixelArt: true,
        antialias: false,
        roundPixels: true,
    }
};

new Phaser.Game(config);
            