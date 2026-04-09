module.exports = {
    name: 'spawnpokemon',
    aliases: ['spawnpoke', 'spawnpkm'],
    exp: 3,
    cool: 10,
    react: '🌟',
    category: 'pokemon',
    usage: 'Use :spawnpokemon',
    description: 'Spawns a wild Pokemon in the current chat for anyone to challenge',
    async execute(client, arg, M) {
        try {
            if (!client.spawnWildPokemon) {
                return M.reply('Pokemon spawner is not ready yet. Try again in a moment.')
            }

            await client.spawnWildPokemon(M.from, { spawnedBy: M.sender })
            await M.reply('Wild Pokemon spawned. For the next 60 seconds, only you can start the wild battle.')
        } catch (error) {
            console.error(error)
            await M.reply('Failed to spawn a wild Pokemon right now.')
        }
    }
}
