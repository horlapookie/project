module.exports = {
  name: 'yuspawn',
  aliases: ['spawnyu', 'spawnyucard'],
  exp: 0,
  cool: 60,
  react: '🃏',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}yuspawn (owner/mod only)',
  description: 'Spawn a wild Yu-Gi-Oh card in the group for players to battle',
  async execute(client, arg, M) {
    if (!M.isGroup) return M.reply('This command only works in groups.')

    if (!client.isOwner(M) && !client.isMod(M)) {
      return M.reply('Only the owner or mods can manually spawn a Yu-Gi-Oh card.')
    }

    if (!client.spawnYuCard) {
      return M.reply('The Yu-Gi-Oh spawner is not ready yet. Try again in a moment.')
    }

    try {
      const active = await client.DB.get(`yu-spawn-${M.from}`).catch(() => null)
      if (active && active.expiresAt && Date.now() < Number(active.expiresAt)) {
        return M.reply('A wild Yu-Gi-Oh card is already active here! Use `-yuget <deckIndex>` to battle it.')
      }

      await client.spawnYuCard(M.from)
    } catch (err) {
      console.error('yuspawn error:', err)
      return M.reply('Failed to spawn a Yu-Gi-Oh card right now. Try again!')
    }
  }
}
