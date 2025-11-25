// src/systems/InputManager.js
export class InputManager {
    constructor(scene) {
        this.scene = scene;
        this.isMiddleButtonDown = false;
        this.lastCameraX = 0;
        this.lastCameraY = 0;
        this.lastPointerX = 0;
        this.lastPointerY = 0;
    }

    initialize() {
        this.scene.input.on('pointerdown', this.onPointerDown.bind(this));
        this.scene.input.on('pointermove', this.onPointerMove.bind(this));
        this.scene.input.on('pointerup', this.onPointerUp.bind(this));
        this.scene.input.mouse.disableContextMenu();
    }

    onPointerDown(pointer) {
        if (this.scene.gameState !== 'PLAYER_TURN' || this.scene.isMoving) return;

        if (pointer.middleButtonDown()) {
            this.isMiddleButtonDown = true;
            this.lastCameraX = this.scene.cameras.main.scrollX;
            this.lastCameraY = this.scene.cameras.main.scrollY;
            this.lastPointerX = pointer.x;
            this.lastPointerY = pointer.y;
            return;
        }
        if (pointer.rightButtonDown()) {
            this.scene.cancelPlayerAction();
            return;
        }

        if (pointer.leftButtonDown()) {
            const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
            const gridPos = this.scene.mapManager.screenToGrid(worldPoint.x, worldPoint.y);

            if (gridPos.x < 0 || gridPos.x >= this.scene.mapManager.mapConsts.MAP_SIZE_X || gridPos.y < 0 || gridPos.y >= this.scene.mapManager.mapConsts.MAP_SIZE_Y) {
                return;
            }

            const isTileValid = this.scene.validActionTiles.some(tile => tile.x === gridPos.x && tile.y === gridPos.y);
            if (!isTileValid) {
                return;
            }

            const targetUnit = this.scene.unitManager.getUnitAtGridPos(gridPos);

            this.scene.actionManager.handleAction(this.scene.playerActionState, targetUnit || gridPos);
        }
    }

    onPointerMove(pointer) {
        if (this.isMiddleButtonDown) {
            const dx = pointer.x - this.lastPointerX;
            const dy = pointer.y - this.lastPointerY;

            this.scene.cameras.main.scrollX = this.lastCameraX - dx / this.scene.cameras.main.zoom;
            this.scene.cameras.main.scrollY = this.lastCameraY - dy / this.scene.cameras.main.zoom;
        }
    }

    onPointerUp(pointer) {
        if (this.isMiddleButtonDown) {
            this.isMiddleButtonDown = false;
        }
    }
}
