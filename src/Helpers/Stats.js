const ranks = [
    '🌸 Citizen',
    '🔎 Cleric',
    '🔮 Wizard',
    '♦️ Mage',
    '🎯 Noble',
    '🎯 Noble II',
    '✨ Elite',
    '✨ Elite II',
    '✨ Elite III',
    '🔶️ Ace',
    '🔶️ Ace II',
    '🔶️ Ace III',
    '🔶️ Ace IV',
    '☣ Knight',
    '☣ Knight II',
    '☣ Knight III',
    '☣ Knight IV',
    '☣ Knight V',
    '🌀 Hero',
    '🌀 Hero II',
    '🌀 Hero III',
    '🌀 Hero IV',
    '🌀 Hero V',
    '💎 Supreme',
    '💎 Supreme II',
    '💎 Supreme III',
    '💎 Supreme IV',
    '💎 Supreme V',
    '❄️ Mystic',
    '❄️ Mystic II',
    '❄️ Mystic III',
    '❄️ Mystic IV',
    '❄️ Mystic V',
    '🔆 Legendary',
    '🔆 Legendary II',
    '🔆 Legendary III',
    '🔆 Legendary IV',
    '🔆 Legendary V',
    '🛡 Guardian',
    '🛡 Guardian II',
    '🛡 Guardian III',
    '🛡 Guardian IV',
    '🛡 Guardian V',
    '♨ Valor'
]

/**
 * @param {number} level
 * @returns {{requiredXpToLevelUp: number, rank: string}}
 */

const getStats = (level) => {
    let required = 100
    for (let i = 1; i <= level; i++) required += 5 * (i * 50) + 100 * i * (i * (i + 1)) + 300
    const rank = level > ranks.length ? ranks[ranks.length - 1] : ranks[level - 1]
    return {
        requiredXpToLevelUp: required,
        rank
    }
}

/**
 * Compute level from total XP using getStats thresholds.
 * @param {number} xp
 * @param {number} [maxLevel=500]
 * @returns {number}
 */
const getLevelFromXp = (xp, maxLevel = 500) => {
    const totalXp = Math.max(0, Number(xp) || 0)
    let level = 1
    while (level < maxLevel && totalXp >= getStats(level).requiredXpToLevelUp) {
        level += 1
    }
    return level
}

module.exports = {
    getStats,
    ranks,
    getLevelFromXp
}
