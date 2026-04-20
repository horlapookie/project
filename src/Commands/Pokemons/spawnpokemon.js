module.exports = {
    name: 'spawnpokemon',
    aliases: ['spawnpoke', 'spawnpkm'],
    exp: 3,
    cool: 250,
    react: '🌟',
    category: 'pokemon',
    usage: 'Use :spawnpokemon',
    description: 'Spawns a wild Pokemon in the current chat for anyone to challenge',
    async execute(client, arg, M) {
        try {
            if (!client.spawnWildPokemon) {
                return M.reply('Pokemon spawner is not ready yet. Try again in a moment.')
            }

            // Some users type things like "-spawnpokemon-mewtwo" or accidentally include the command name.
            const forced = String(arg || '')
                .trim()
                .replace(/^spawnpokemon[-\s]*/i, '')
                .replace(/^-+/, '')
                .trim()
            if (forced) {
                if (!client.isMod(M)) {
                    return M.reply('Only mods can force-spawn a specific Pokemon. Use the command without a name for a random spawn.')
                }
                const normalized = forced.toLowerCase().replace(/\s+/g, '-')
                await client.spawnWildPokemon(M.from, { spawnedBy: M.sender, forceName: normalized })
                // Spawn handler announces the Pokemon; we keep the 60s lock silent.
                return null
            }

            await client.spawnWildPokemon(M.from, { spawnedBy: M.sender })
            // Spawn handler announces the Pokemon; we keep the 60s lock silent.
            return null
        } catch (error) {
            console.error(error)
            await M.reply(String(error?.message || '').includes('Invalid pokemon name')
                ? 'Invalid Pokemon name. Try something like `mewtwo` or `mr-mime`.'
                : 'Failed to spawn a wild Pokemon right now.')
        }
    }
}
