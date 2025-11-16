
import { Game } from './scenes/Game.js';
import { TimelineUI } from "./scenes/TimelineUI.js";
import { ActionUI } from "./scenes/ActionUI.js";
import { Preloader } from "./scenes/Preloader.js";
import { GameOver } from "./scenes/GameOver.js";

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: [Preloader, Game, TimelineUI, ActionUI, GameOver],
    render: {
        pixelArt: true
    }
};

new Phaser.Game(config);
            