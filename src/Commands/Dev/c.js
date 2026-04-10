const path = require('path');

module.exports = {
  name: 'spawncard',
  aliases: ['spawn', 'event', 'scard'],
  category: 'card game',
  exp: 5,
  cool: 6,
  react: "🎴",
  usage: 'Use :spawncard [--tier=1|2|3|4|5|6|S]',
  description: 'Spawns an anime card in the current chat',
  async execute(client, arg, M) {
    const cardsPath = path.join(__dirname, '../../Helpers/card.json');
    delete require.cache[require.resolve(cardsPath)];
    const data = require(cardsPath);

    const requestedTierMatch = String(arg || '').match(/--tier\s*=\s*([0-9]|S)/i);
    const requestedTierRaw = requestedTierMatch ? String(requestedTierMatch[1]).toUpperCase() : '';

    const isMod = client.isMod(M);
    const allowedTiers = isMod ? ['1', '2', '3', '4', '5', '6', 'S'] : ['1', '2', '3', '4', '5'];

    if (requestedTierRaw) {
      if (!isMod) return M.reply('Only moderators can force-spawn a specific tier.')
      if (!allowedTiers.includes(requestedTierRaw)) return M.reply('Invalid tier. Use `--tier=1|2|3|4|5|6|S`.')
    }

    const poolTier = requestedTierRaw || allowedTiers[client.utils.getRandomInt(0, allowedTiers.length - 1)];
    const pool = data.filter((card) => String(card.tier).toUpperCase() === poolTier);
    if (!pool.length) return M.reply('No cards found for that tier.')

    const obj = pool[client.utils.getRandomInt(0, pool.length - 1)];
    const tier = String(obj.tier).toUpperCase();

    const priceForTier = (t) => {
      switch (t) {
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

    const price = priceForTier(tier);

    // Collect command expects: { card: 'Title-Tier', price: number }
    await client.cardMap.set(M.from, { card: `${obj.title}-${tier}`, price });

    const caption =
      `🎴 ━『 ANIME-CARD 』━ 🎴\n\n` +
      `💮 Name: ${obj.title}\n` +
      `💠 Tier: ${tier}\n` +
      `🏮 Price: ${price}\n\n` +
      `🔖 Use *${client.prefix}collect* to claim this card.`;

    const url = String(obj.url || '').trim();
    if (!url) {
      await M.reply(caption);
    } else if (url.toLowerCase().endsWith('.gif')) {
      // No ffmpeg needed. WhatsApp will show it as a downloadable GIF document.
      await client.sendMessage(
        M.from,
        {
          document: { url },
          mimetype: 'image/gif',
          fileName: `${obj.title}.gif`,
          caption
        },
        { quoted: M }
      );
    } else {
      await client.sendMessage(
        M.from,
        { image: { url }, caption },
        { quoted: M }
      );
    }

    // Auto-expire after 5 minutes
    setTimeout(async () => {
      try {
        client.cardMap.delete(M.from)
      } catch (_) {
        // ignore
      }
    }, 5 * 60 * 1000);
  }
};
