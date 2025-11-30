
export function getBoostedStats(baseStats, rarity) {
    // This function is being phased out. Stat boosts are now handled by the star system in Game.js.
    // For now, it returns base stats to avoid breaking existing calls.
    const newStats = { ...baseStats };
    newStats.currentHealth = newStats.maxHealth; // Ensure current health matches max health
    return newStats;
}

