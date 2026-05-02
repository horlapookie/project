const { getDeck, getDeckHp, getCardHp, calcCardHp, isCardFainted } = require('../../Helpers/yugioh')
const { getUserKey } = require('../../Helpers/yugiohCommand')

const hpBar = (current, max) => {
  const pct = Math.max(0, Math.min(1, current / max))
  const filled = Math.round(pct * 8)
  const bar = '█'.repeat(filled) + '░'.repeat(8 - filled)
  return `[${bar}] ${current}/${max}`
}

module.exports = {
  name: 'yudeck',
  aliases: [],
  exp: 0,
  cool: 4,
  react: '📦',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}yudeck [index]',
  description: 'View your Yu-Gi-Oh battle deck with HP status',
  async execute(client, arg, M) {
    const userKey = getUserKey(client, M)
    const deck = await getDeck(client, userKey)
    if (!deck.length) return M.reply('Your Yu-Gi-Oh deck is empty.')

    const hpMap = await getDeckHp(client, userKey)

    const idx = parseInt(String(arg || '').trim(), 10)
    if (idx && !isNaN(idx)) {
      const card = deck[idx - 1]
      if (!card) return M.reply(`Invalid index. Your deck has ${deck.length} card(s).`)

      const { current, max } = getCardHp(hpMap, card)
      const fainted = isCardFainted(hpMap, card)
      const status = fainted ? '💀 FAINTED' : `❤️ ${hpBar(current, max)}`

      const caption = [
        fainted ? `💀 *FAINTED — use -yuheal to restore*` : `❤️ *HP: ${hpBar(current, max)}*`,
        ``,
        `🏮 *Name:* ${card.name}`,
        `🎃 *Type:* ${card.type}`,
        `🎗 *Race:* ${card.race}`,
        `📍 *ATK:* ${card.atk ?? 'N/A'}`,
        `🛡 *DEF:* ${card.def ?? 'N/A'}`,
        `✨ *Level:* ${card.level ?? 'N/A'}`,
        `🧿 *Attribute:* ${card.attribute || 'N/A'}`,
        `💰 *Value:* ${card.price}`
      ].join('\n')

      if (card.image) {
        const buffer = await client.utils.getBuffer(card.image)
        return client.sendMessage(M.from, { image: buffer, caption }, { quoted: M })
      }
      return M.reply(caption)
    }

    const faintedCount = deck.filter(c => isCardFainted(hpMap, c)).length
    let text = `🃏 *Yu-Gi-Oh Battle Deck* (${deck.length} cards`
    if (faintedCount > 0) text += ` — ⚠️ ${faintedCount} fainted`
    text += `)\n\n`

    deck.forEach((card, i) => {
      const { current, max } = getCardHp(hpMap, card)
      const fainted = isCardFainted(hpMap, card)
      const status = fainted ? `💀 FAINTED` : `❤️ ${current}/${max} HP`
      text += `*${i + 1}.* ${card.name}\n    ⚔ ${card.atk ?? '?'} / 🛡 ${card.def ?? '?'} — ${status}\n`
    })

    if (faintedCount > 0) {
      text += `\n_Use *${client.prefix}yuheal* to restore fainted cards (500 💎 each)_`
    }

    return M.reply(text.trim())
  }
}
