const { getUserKey } = require('../../Helpers/yugiohCommand')

module.exports = {
  name: 'yurank',
  aliases: ['yulb', 'yuleaderboard', 'yuduellb'],
  exp: 0,
  cool: 8,
  react: '🏆',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}yurank',
  description: 'Top Yu-Gi-Oh duelists leaderboard ranked by wins',
  async execute(client, arg, M) {
    const players = (await client.DB.get('yu-players').catch(() => null)) || []

    if (!players.length) {
      return M.reply('No Yu-Gi-Oh battles have been recorded yet. Start dueling!')
    }

    const results = []
    for (const key of players) {
      const wins = Number((await client.DB.get(`yu-wins-${key}`).catch(() => null)) || 0)
      const losses = Number((await client.DB.get(`yu-losses-${key}`).catch(() => null)) || 0)
      if (wins > 0 || losses > 0) results.push({ key, wins, losses })
    }

    if (!results.length) return M.reply('No duel records found yet.')

    results.sort((a, b) => b.wins - a.wins || a.losses - b.losses)

    const myKey = getUserKey(client, M)
    const myPos = results.findIndex(r => r.key === myKey)
    const top = results.slice(0, 10)

    const medals = ['🥇', '🥈', '🥉']
    const mentions = []

    let text = `⚔️ *YU-GI-OH DUEL LEADERBOARD* ⚔️\n\n`
    text += `Your Rank: ${myPos >= 0 ? `#${myPos + 1} (${results[myPos].wins}W / ${results[myPos].losses}L)` : 'Unranked'}\n`
    text += `─────────────────────\n\n`

    for (let i = 0; i < top.length; i++) {
      const { key, wins, losses } = top[i]
      const jid = `${key}@s.whatsapp.net`
      mentions.push(jid)
      const medal = medals[i] || `*(${i + 1})*`
      const total = wins + losses
      const winRate = total > 0 ? `${((wins / total) * 100).toFixed(0)}%` : '0%'
      text += `${medal} *@${key}*\n`
      text += `   ⚔️ ${wins} Wins | 💀 ${losses} Losses | 📊 ${winRate}\n\n`
    }

    return client.sendMessage(M.from, {
      text: text.trim(),
      mentions
    }, { quoted: M })
  }
}
