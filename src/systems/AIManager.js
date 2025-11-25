// src/systems/AIManager.js
export class AIManager {
    constructor(scene) {
        this.scene = scene;
    }

    takeEnemyTurn(enemy, onTurnComplete) {
        const attackMove = enemy.moves.find(m => m.type === 'attack');

        let closestPlayerUnit = null;
        let minDistance = Infinity;
        for (const playerUnit of this.scene.unitManager.playerUnits) {
            const distance = Math.abs(playerUnit.gridPos.x - enemy.gridPos.x) + Math.abs(playerUnit.gridPos.y - enemy.gridPos.y);
            if (distance < minDistance) {
                minDistance = distance;
                closestPlayerUnit = playerUnit;
            }
        }

        if (!closestPlayerUnit) {
            onTurnComplete();
            return;
        }

        const doAttack = (callback) => {
            const dx = closestPlayerUnit.gridPos.x - enemy.gridPos.x;
            const dy = closestPlayerUnit.gridPos.y - enemy.gridPos.y;
            if (dx < 0 || (dx === 0 && dy < 0)) {
                enemy.sprite.flipX = true;
            } else {
                enemy.sprite.flipX = false;
            }

            enemy.attack(closestPlayerUnit, () => {
                enemy.sprite.flipX = false;
                const damageInfo = enemy.calculateDamage(closestPlayerUnit);
                closestPlayerUnit.takeDamage(damageInfo, enemy, attackMove);
                if (callback) {
                    this.scene.time.delayedCall(300, callback, []);
                }
            });
        };

        const distanceToTarget = Math.abs(closestPlayerUnit.gridPos.x - enemy.gridPos.x) + Math.abs(closestPlayerUnit.gridPos.y - enemy.gridPos.y);

        if (distanceToTarget <= attackMove.range) {
            doAttack(onTurnComplete);
        } else {
            const targetableTiles = [];
            const neighbors = [
                {x: closestPlayerUnit.gridPos.x + 1, y: closestPlayerUnit.gridPos.y},
                {x: closestPlayerUnit.gridPos.x - 1, y: closestPlayerUnit.gridPos.y},
                {x: closestPlayerUnit.gridPos.x, y: closestPlayerUnit.gridPos.y + 1},
                {x: closestPlayerUnit.gridPos.x, y: closestPlayerUnit.gridPos.y - 1}
            ];

            const occupiedPositions = new Set(this.scene.unitManager.units.map(u => `${u.gridPos.x},${u.gridPos.y}`));

            for (const neighbor of neighbors) {
                if (neighbor.x >= 0 && neighbor.x < this.scene.mapManager.mapConsts.MAP_SIZE_X &&
                    neighbor.y >= 0 && neighbor.y < this.scene.mapManager.mapConsts.MAP_SIZE_Y &&
                    this.scene.mapManager.walkableTiles.includes(this.scene.mapManager.grid[neighbor.y][neighbor.x]) &&
                    !occupiedPositions.has(`${neighbor.x},${neighbor.y}`)) {
                    targetableTiles.push(neighbor);
                }
            }

            if (targetableTiles.length > 0) {
                const target = targetableTiles.sort((a, b) => {
                    const distA = Math.abs(a.x - enemy.gridPos.x) + Math.abs(a.y - enemy.gridPos.y);
                    const distB = Math.abs(b.x - enemy.gridPos.x) + Math.abs(b.y - enemy.gridPos.y);
                    return distA - distB;
                })[0];

                this.scene.unitManager.units.forEach(unit => {
                    if (unit !== enemy) {
                        this.scene.mapManager.easystar.avoidAdditionalPoint(unit.gridPos.x, unit.gridPos.y);
                    }
                });
                this.scene.mapManager.findPath({x: enemy.gridPos.x, y: enemy.gridPos.y}, {x: target.x, y: target.y}, (path) => {
                    if (path && path.length > 1) {
                        const truncatedPath = path.slice(0, Math.min(path.length, enemy.stats.moveRange + 1));
                        this.scene.moveCharacterAlongPath(enemy, truncatedPath, () => {
                            const newDistance = Math.abs(closestPlayerUnit.gridPos.x - enemy.gridPos.x) + Math.abs(closestPlayerUnit.gridPos.y - enemy.gridPos.y);
                            if (newDistance <= attackMove.range) {
                                doAttack(onTurnComplete);
                            } else {
                                onTurnComplete();
                            }
                        });
                    } else {
                        onTurnComplete();
                    }
                    this.scene.unitManager.units.forEach(unit => {
                        if (unit !== enemy) {
                            this.scene.mapManager.easystar.stopAvoidingAdditionalPoint(unit.gridPos.x, unit.gridPos.y);
                        }
                    });
                });
            } else {
                onTurnComplete();
            }
        }
    }
}
