
export function getBoostedStats(baseStats, rarity) {
    // This function is being phased out. Stat boosts are now handled by the star system in Game.js.
    // For now, it returns base stats to avoid breaking existing calls.
    const newStats = { ...baseStats };
    newStats.currentHealth = newStats.maxHealth; // Ensure current health matches max health
    return newStats;
}

export function calculateStatsForStars(baseStats, stars) {
    if (!stars || stars <= 1) {
        const newStats = { ...baseStats };
        newStats.currentHealth = newStats.maxHealth;
        return newStats;
    }

    const multiplier = Math.pow(2, stars - 1);
    const newStats = { ...baseStats };

    const statsToBoost = ['maxHealth', 'physicalDamage', 'magicDamage'];

    statsToBoost.forEach(key => {
        if (newStats[key]) {
            newStats[key] = Math.round(newStats[key] * multiplier);
        }
    });

    newStats.currentHealth = newStats.maxHealth;
    return newStats;
}
