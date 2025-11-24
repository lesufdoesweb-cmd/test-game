
import { Game } from './scenes/Game.js';
import { TimelineUI } from "./scenes/TimelineUI.js";
import { ActionUI } from "./scenes/ActionUI.js";
import { Preloader } from "./scenes/Preloader.js";
import { GameOver } from "./scenes/GameOver.js";
import { Background } from "./scenes/Background.js";
import { MainMenu } from "./scenes/MainMenu.js";

const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    backgroundColor: '#00000000', // Transparent black
    pixelArt: true,
    antialias: false,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [Preloader, Background, Game, TimelineUI, ActionUI, GameOver, MainMenu],
    render: {
        pixelArt: true,
        antialias: false
    }
};

new Phaser.Game(config);
            