import { Boot } from './scenes/Boot.js';
import { Preloader } from './scenes/Preloader.js';
import { MainMenu } from './scenes/MainMenu.js';
import { Options } from './scenes/Options.js';
import { Start } from './scenes/Start.js';
import { Game } from './scenes/Game.js';
import { ShmupGame } from './scenes/ShmupGame.js';
import { GameOver } from './scenes/GameOver.js';

const config = {
    type: Phaser.AUTO,
    title: 'Shmup',
    description: '',
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#000000',
    pixelArt: false,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 }
        }
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        Options,
        Start,
        Game,
        ShmupGame,
        GameOver
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
}

new Phaser.Game(config);
            