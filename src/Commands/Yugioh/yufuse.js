const axios = require('axios')
const { getCollection, setCollection, normalizeCard, YU_API } = require('../../Helpers/yugioh')
const { getUserKey } = require('../../Helpers/yugiohCommand')

const tryFetchRealFusion = async (race) => {
  try {
    const offset = Math.floor(Math.random() * 40)
    const resp = await axios.get(
      `${YU_API}?type=Fusion+Monster&race=${encodeURIComponent(race)}&num=10&offset=${offset}`,
      { timeout: 8000 }
    )
    const cards = resp.data?.data || []
    if (cards.length) return cards[Math.floor(Math.random() * cards.length)]
  } catch (_) {}
  return null
}

const makeFusionName = (nameA, nameB) => {
  const wordA = nameA.split(' ').find(w => w.length > 3) || nameA.split(' ')[0]
  const wordB = nameB.split(' ').find(w => w.length > 3 && w !== wordA) || nameB.split(' ')[0]
  return `${wordA} ${wordB} Fusion`
}

module.exports = {
  name: 'yufuse',
  aliases: ['yufusion', 'yumerge', 'yucombine'],
  exp: 5,
  cool: 15,
  react: '⚗️',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}yufuse <idx1> <idx2>',
  description: 'Fuse two monster cards from your collection into a powerful Fusion Monster',
  async execute(client, arg, M) {
    const parts = String(arg || '').trim().split(/\s+/).filter(Boolean)

    if (parts.length < 2) {
      return M.reply([
        `Use *${client.prefix}yufuse <idx1> <idx2>*`,
        ``,
        `Pick two Monster cards from your *collection* by index.`,
        `Example: *${client.prefix}yufuse 1 3*`,
        ``,
        `The two source cards are consumed and a Fusion Monster is created.`
      ].join('\n'))
    }

    const i1 = parseInt(parts[0], 10) - 1
    const i2 = parseInt(parts[1], 10) - 1

    if (isNaN(i1) || isNaN(i2) || i1 < 0 || i2 < 0 || i1 === i2) {
      return M.reply('Provide two DIFFERENT valid index numbers from your collection.')
    }

    const userKey = getUserKey(client, M)
    const collection = await getCollection(client, userKey)

    if (!collection.length) return M.reply('Your collection is empty.')
    if (i1 >= collection.length || i2 >= collection.length) {
      return M.reply(`Invalid index. Your collection has *${collection.length}* cards.`)
    }

    const lo = Math.min(i1, i2)
    const hi = Math.max(i1, i2)
    const cardA = collection[lo]
    const cardB = collection[hi]

    const typeA = String(cardA.type || '').toLowerCase()
    const typeB = String(cardB.type || '').toLowerCase()
    if (!typeA.includes('monster') || !typeB.includes('monster')) {
      return M.reply(`Both cards must be Monster-type to fuse.\n*${cardA.name}* (${cardA.type})\n*${cardB.name}* (${cardB.type})`)
    }

    await M.reply(`🔮 Fusing *${cardA.name}* + *${cardB.name}*...`)

    let fusionCard = null

    const realFusion = await tryFetchRealFusion(cardA.race || cardB.race || 'Dragon')
    if (realFusion) {
      fusionCard = normalizeCard(realFusion)
      fusionCard.uid = `fusion-${Date.now()}-${Math.floor(Math.random() * 10000)}`
      fusionCard.fusion = true
      fusionCard.materials = [cardA.name, cardB.name]
    } else {
      const atk = Math.floor((Number(cardA.atk || 0) + Number(cardB.atk || 0)) * 0.85)
      const def = Math.floor((Number(cardA.def || 0) + Number(cardB.def || 0)) * 0.85)
      const level = (Number(cardA.level || 0) + Number(cardB.level || 0))
      fusionCard = {
        id: `custom-fusion-${Date.now()}`,
        name: makeFusionName(cardA.name, cardB.name),
        type: 'Fusion Monster',
        race: cardA.race || 'Unknown',
        atk,
        def,
        level,
        attribute: cardA.attribute || 'DARK',
        image: cardA.image,
        price: Math.floor((Number(cardA.price || 0) + Number(cardB.price || 0)) * 1.2),
        uid: `fusion-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        fusion: true,
        materials: [cardA.name, cardB.name]
      }
    }

    collection.splice(hi, 1)
    collection.splice(lo, 1)
    collection.push(fusionCard)
    await setCollection(client, userKey, collection)

    const caption = [
      `⚗️ *Fusion Summon!*`,
      ``,
      `*Materials used:*`,
      `🃏 ${cardA.name} (ATK: ${cardA.atk ?? 'N/A'} / DEF: ${cardA.def ?? 'N/A'})`,
      `🃏 ${cardB.name} (ATK: ${cardB.atk ?? 'N/A'} / DEF: ${cardB.def ?? 'N/A'})`,
      ``,
      `✨ *Fusion Result: ${fusionCard.name}*`,
      `⚔️ ATK: ${fusionCard.atk ?? 'N/A'}`,
      `🛡 DEF: ${fusionCard.def ?? 'N/A'}`,
      `🌟 Level: ${fusionCard.level ?? 'N/A'}`,
      `📌 Type: ${fusionCard.type}`,
      ``,
      `Added to your collection!`,
      `Move it to your deck with *${client.prefix}t2yudeck* to use it in battle.`
    ].join('\n')

    try {
      if (fusionCard.image) {
        const buffer = await client.utils.getBuffer(fusionCard.image)
        return client.sendMessage(M.from, { image: buffer, caption }, { quoted: M })
      }
    } catch (_) {}

    return M.reply(caption)
  }
}
