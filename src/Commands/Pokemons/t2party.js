module.exports = {
    name: 't2party',
    aliases: ['toparty'],
    exp: 2,
    cool: 4,
    react: '🎒',
    category: 'pokemon',
    usage: 'Use :t2party 1',
    description: 'Transfer a Pokemon from your PC (PSS) to your party',
    async execute(client, arg, M) {
        const battle = client.pokemonBattleResponse.get(M.from)
        if (battle && (battle.players?.includes(M.sender) || battle.player1?.user === M.sender)) {
            return M.reply('You cannot transfer Pokemon while you are battling.')
        }

        const idx = parseInt(String(arg || '').trim(), 10)
        if (!idx || idx < 1) {
            return M.reply(`Use *${client.prefix}t2party 1*`)
        }

        const party = (await client.poke.get(`${M.sender}_Party`)) || []
        if (party.length >= 6) return M.reply('Your party is full (6). Move something to PC first.')

        const pss = (await client.poke.get(`${M.sender}_PSS`)) || []
        if (!pss.length) return M.reply('Your PC is empty.')
        if (idx > pss.length) return M.reply(`Invalid PC index. Your PC has ${pss.length} Pokemon.`)

        const [pokemon] = pss.splice(idx - 1, 1)
        party.push(pokemon)

        await client.poke.set(`${M.sender}_Party`, party)
        await client.poke.set(`${M.sender}_PSS`, pss)

        return M.reply(`Transferred *${client.utils.capitalize(pokemon.name)}* to your party. Party: ${party.length}/6, PC: ${pss.length}.`)
    }
}

