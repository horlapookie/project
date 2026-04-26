const path = require('path');

module.exports = {
  name: 'spawnpack',
  aliases: ['spack'],
  category: 'card game',
  exp: 5,
  cool: 6,
  react: "🎴",
  usage: 'Use {prefix}spawnpack',
  description: 'Spawns a 10-card pack (backside gallery) in the current chat',
  async execute(client, arg, M) {
    const cardsPath = path.join(__dirname, '../../Helpers/card.json');
    delete require.cache[require.resolve(cardsPath)];
    const data = require(cardsPath);

    if (!Array.isArray(data) || data.length === 0) return M.reply('No cards available right now.');

    const priceForTier = (t) => {
      switch (String(t).toUpperCase()) {
        case '1': return client.utils.getRandomInt(2000, 4000);
        case '2': return client.utils.getRandomInt(4000, 5000);
        case '3': return client.utils.getRandomInt(4000, 5000);
        case '4': return client.utils.getRandomInt(8000, 10000);
        case '5': return client.utils.getRandomInt(25000, 40000);
        case '6': return client.utils.getRandomInt(70000, 90000);
        case 'S': return client.utils.getRandomInt(100000, 500000);
        default: return client.utils.getRandomInt(2000, 4000);
      }
    }

    // Bucket cards by tier so we can guarantee occasional tier-6 / S inclusion.
    const byTier = data.reduce((acc, c) => {
      const t = String(c.tier).toUpperCase()
      if (!acc[t]) acc[t] = []
      acc[t].push(c)
      return acc
    }, {})

    // Weighted tier draw — tier 6 and S are rare but possible.
    const TIER_WEIGHTS = [
      { tier: '1', weight: 28 },
      { tier: '2', weight: 22 },
      { tier: '3', weight: 18 },
      { tier: '4', weight: 14 },
      { tier: '5', weight: 10 },
      { tier: '6', weight: 6 },
      { tier: 'S', weight: 2 }
    ]
    const totalWeight = TIER_WEIGHTS.reduce((s, x) => s + x.weight, 0)

    const drawTier = () => {
      let r = Math.floor(Math.random() * totalWeight)
      for (const { tier, weight } of TIER_WEIGHTS) {
        r -= weight
        if (r < 0) return tier
      }
      return '1'
    }

    const drawCard = () => {
      // Try the rolled tier; if none available in that tier, fall back to a random tier.
      const triedTiers = new Set()
      let pickedTier = drawTier()
      while (!byTier[pickedTier]?.length && triedTiers.size < TIER_WEIGHTS.length) {
        triedTiers.add(pickedTier)
        pickedTier = TIER_WEIGHTS.find((t) => !triedTiers.has(t.tier))?.tier || '1'
      }
      const pool = byTier[pickedTier] || data
      const obj = pool[client.utils.getRandomInt(0, pool.length - 1)]
      return { obj, tier: String(obj.tier).toUpperCase() }
    }

    const packCards = []
    let hasRare = false
    for (let i = 0; i < 10; i += 1) {
      const { obj, tier } = drawCard()
      if (tier === '6' || tier === 'S') hasRare = true
      const price = priceForTier(tier)
      packCards.push({
        title: obj.title,
        tier,
        url: obj.url,
        price,
        card: `${obj.title}-${tier}`
      })
    }
    // ~25% of the time, force at least one tier-6 or S card if none was rolled
    if (!hasRare && Math.random() < 0.25) {
      const rarePool = (byTier['6'] || []).concat(byTier['S'] || [])
      if (rarePool.length) {
        const obj = rarePool[client.utils.getRandomInt(0, rarePool.length - 1)]
        const tier = String(obj.tier).toUpperCase()
        const price = priceForTier(tier)
        const replaceIdx = client.utils.getRandomInt(0, packCards.length - 1)
        packCards[replaceIdx] = {
          title: obj.title,
          tier,
          url: obj.url,
          price,
          card: `${obj.title}-${tier}`
        }
      }
    }

    const totalPrice = packCards.reduce((sum, c) => sum + (c.price || 0), 0)
    await client.cardMap.set(M.from, { pack: packCards, price: totalPrice })

    const caption =
      `🎴 ━『 CARD PACK 』━ 🎴\n\n` +
      `🧧 Cards: 10\n` +
      `🏮 Price: ${totalPrice}\n\n` +
      `🔖 Use *${client.prefix}collect* to claim this pack.`;

    const gallery = await client.utils.drawCardPackGallery(packCards, { mode: 'back', title: 'CARD PACK' })
    await client.sendMessage(M.from, { image: gallery, caption }, { quoted: M })

    setTimeout(async () => {
      try {
        client.cardMap.delete(M.from)
      } catch (_) {
        // ignore
      }
    }, 5 * 60 * 1000);
  }
};
