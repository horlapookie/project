module.exports = {
  name: 'yutrade-delete',
  aliases: ['yutrade-cancel'],
  exp: 0,
  cool: 4,
  react: '🗑',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}yutrade-delete',
  description: 'Cancel a pending Yu-Gi-Oh trade',
  async execute(client, arg, M) {
    const trade = await client.DB.get(`yu-trade-${M.from}`)
    if (!trade) return M.reply('No pending trade in this chat.')

    await client.DB.delete(`yu-trade-${M.from}`)
    return M.reply('Trade cancelled.')
  }
}

