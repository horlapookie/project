const { getDeck, getDeckHp, setDeckHp, calcCardHp, isCardFainted, getCardHp } = require('../../Helpers/yugioh')
const { getUserKey } = require('../../Helpers/yugiohCommand')

const HEAL_COST = 500

module.exports = {
  name: 'yuheal',
  aliases: ['yurevive', 'yurestore'],
  exp: 0,
  cool: 10,
  react: '💊',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}yuheal',
  description: 'Restore all fainted deck cards to full HP (500 gems per card)',
  async execute(client, arg, M) {
    const userKey = getUserKey(client, M)
    const deck = await getDeck(client, userKey)

    if (!deck.length) return M.reply('Your Yu-Gi-Oh deck is empty.')

    const hpMap = await getDeckHp(client, userKey)
    const fainted = deck.filter(c => isCardFainted(hpMap, c))
    const damaged = deck.filter(c => {
      if (isCardFainted(hpMap, c)) return false
      const { current, max } = getCardHp(hpMap, c)
      return current < max
    })

    if (!fainted.length && !damaged.length) {
      return M.reply([
        `✅ *All cards are at full health!*`,
        ``,
        ...deck.map((c, i) => {
          const { current, max } = getCardHp(hpMap, c)
          return `*${i + 1}.* ${c.name} — ❤️ ${current}/${max} HP`
        })
      ].join('\n'))
    }

    const toHeal = [...fainted, ...damaged]
    const cost = fainted.length * HEAL_COST

    const econ = await client.getEcon(M, { createIfMissing: true })
    const balance = econ ? (econ.gem || 0) : 0

    if (cost > 0 && balance < cost) {
      const faintedList = fainted.map(c => `💀 ${c.name} (needs ${HEAL_COST} 💎)`).join('\n')
      return M.reply([
        `*Fainted cards need healing:*`,
        faintedList,
        ``,
        `Total cost: *${cost} 💎*`,
        `Your balance: *${balance} 💎*`,
        ``,
        `You need *${cost - balance} more gems* to heal.`
      ].join('\n'))
    }

    for (const card of toHeal) {
      hpMap[card.uid] = calcCardHp(card)
    }
    await setDeckHp(client, userKey, hpMap)

    if (cost > 0 && econ) {
      econ.gem = balance - cost
      await econ.save()
    }

    const healedList = toHeal.map(c => `❤️ ${c.name} → ${calcCardHp(c)} HP`).join('\n')
    return M.reply([
      `💊 *Healed ${toHeal.length} card(s)!*${cost > 0 ? ` (-${cost} 💎)` : ''}`,
      ``,
      healedList,
      ``,
      `All cards are battle-ready!`
    ].join('\n'))
  }
}
