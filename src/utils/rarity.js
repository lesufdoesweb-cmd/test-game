export const rarityTiers = {
    'common': { order: 1, color: 0xffffff, next: 'rare' },
    'rare': { order: 2, color: 0x0000ff, next: 'epic' },
    'epic': { order: 3, color: 0x9400D3, next: 'legendary' },
    'legendary': { order: 4, color: 0xffd700, next: null }
};

export function getBoostedStats(baseStats, rarity) {
    const boostedStats = { ...baseStats };
    let boost = 1;
    if (rarity === 'rare') boost = 1.2;
    else if (rarity === 'epic') boost = 1.4;
    else if (rarity === 'legendary') boost = 1.7;

    boostedStats.maxHealth = Math.round(baseStats.maxHealth * boost);
    boostedStats.currentHealth = boostedStats.maxHealth; // Also boost current health
    boostedStats.physicalDamage = Math.round(baseStats.physicalDamage * boost);
    if (baseStats.magicDamage) {
        boostedStats.magicDamage = Math.round(baseStats.magicDamage * boost);
    }
    return boostedStats;
}
