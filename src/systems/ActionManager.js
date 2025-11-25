// src/systems/ActionManager.js
import {Projectile} from "../gameObjects/Projectile.js";
import ASSETS from "../assets.js";

export class ActionManager {
    constructor(scene) {
        this.scene = scene;
        this.activeMove = null;
    }

    handleAction(action, target) {
        switch(action) {
            case 'move':
                this.moveUnit(this.scene.activePlayerUnit, target.x, target.y);
                break;
            case 'attack':
            case 'arrow_attack':
                this.performPlayerAttack(target);
                break;
            case 'enhance_armor':
                this.performEnhanceArmor(target);
                break;
        }
    }

    onActionSelected(move) {
        const activeUnit = this.scene.activePlayerUnit;
        if (move.currentCooldown > 0) return;
        if (move.type === 'attack' && activeUnit.usedStandardAction) return;
        if (move.type === 'arrow_attack' && activeUnit.usedStandardAction) return;
        if (move.type === 'move' && activeUnit.hasMoved) return;
        if (activeUnit.stats.currentAp < move.cost) return;

        this.activeMove = move;
        this.scene.playerActionState = move.type;
        this.scene.events.emit('player_action_selected');

        if (move.type === 'attack' || move.type === 'arrow_attack') {
            this.scene.highlightRange(activeUnit.gridPos, move.range, 0xff0000);
            this.scene.highlightAttackableEnemies(move.range);
        } else if (move.type === 'move') {
            this.scene.highlightRange(activeUnit.gridPos, move.range, 0x0000ff);
        } else if (move.type === 'enhance_armor') {
            this.scene.highlightRange(activeUnit.gridPos, move.range, 0x00ff99);
            this.scene.highlightFriendlyTargets(move.range);
        }
    }

    moveUnit(unit, targetX, targetY) {
        if (this.scene.isMoving) {
            return;
        }
        this.scene.clearHighlights();

        this.scene.unitManager.units.forEach(otherUnit => {
            if (otherUnit !== unit) {
                this.scene.mapManager.easystar.avoidAdditionalPoint(otherUnit.gridPos.x, otherUnit.gridPos.y);
            }
        });

        this.scene.mapManager.findPath({x: unit.gridPos.x, y: unit.gridPos.y}, {x: targetX, y: targetY}, (path) => {
            if (path && path.length > 1) {
                const truncatedPath = path.slice(0, Math.min(path.length, unit.stats.moveRange + 1));
                this.scene.moveCharacterAlongPath(unit, truncatedPath);
            } else {
                console.log("Path was not found or is too short.");
            }

            this.scene.unitManager.units.forEach(otherUnit => {
                if (otherUnit !== unit) {
                    this.scene.mapManager.easystar.stopAvoidingAdditionalPoint(otherUnit.gridPos.x, otherUnit.gridPos.y);
                }
            });
        });
    }

    performPlayerAttack(targetUnit) {
        const move = this.activeMove;
        if (!move) return;
        const playerUnit = this.scene.activePlayerUnit;

        playerUnit.stats.currentAp -= move.cost;
        this.scene.events.emit('unit_stats_changed', playerUnit);
        move.currentCooldown = move.cooldown;
        playerUnit.usedStandardAction = true;

        const targetSpriteX = targetUnit.sprite.x;

        if (targetSpriteX < playerUnit.sprite.x) {
            playerUnit.sprite.flipX = true;
        } else {
            playerUnit.sprite.flipX = false;
        }

        const onHit = () => {
            playerUnit.sprite.flipX = false;

            const damageInfo = playerUnit.calculateDamage(targetUnit);
            targetUnit.takeDamage(damageInfo, playerUnit, move);
            this.scene.clearHighlights();
            this.scene.playerActionState = 'SELECTING_ACTION';
            this.scene.events.emit('player_action_completed');
        };

        if (move.type === 'arrow_attack') {
            const projectile = new Projectile(
                this.scene,
                playerUnit.sprite.x,
                playerUnit.sprite.y - 24,
                ASSETS.image.arrow_projectile.key,
                targetUnit.sprite,
                onHit
            );
            projectile.setDepth(9999);
        } else {
            playerUnit.attack(targetUnit, onHit);
        }
    }

    performEnhanceArmor(targetUnit) {
        const move = this.activeMove;
        if (!move) return;

        this.scene.activePlayerUnit.stats.currentAp -= move.cost;
        this.scene.events.emit('unit_stats_changed', this.scene.activePlayerUnit);
        move.currentCooldown = move.cooldown;

        targetUnit.addStatusEffect({ type: 'armor_up', duration: move.duration, amount: move.amount });

        this.scene.clearHighlights();
        this.scene.playerActionState = 'SELECTING_ACTION';
        this.scene.events.emit('player_action_completed');
    }
}
