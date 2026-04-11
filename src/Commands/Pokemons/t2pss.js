module.exports = {
    name: 't2pc',
    aliases: ['t2pc', 't2pss', 'topc', 'topss'],
    exp: 2,
    cool: 4,
    react: '📦',
    category: 'pokemon',
    usage: 'Use :t2pc 1',
    description: 'Transfer a Pokemon from your party to your PC',
    async execute(client, arg, M) {
        const battle = client.pokemonBattleResponse.get(M.from)
        if (battle && (battle.players?.includes(M.sender) || battle.player1?.user === M.sender)) {
            return M.reply('You cannot transfer Pokemon while you are battling.')
        }

        const idx = parseInt(String(arg || '').trim(), 10)
        if (!idx || idx < 1) {
            return M.reply(`Use *${client.prefix}t2pc 1*`)
        }

        const party = (await client.poke.get(`${M.sender}_Party`)) || []
        if (!party.length) return M.reply("Your party is empty.")
        if (idx > party.length) return M.reply(`Invalid party index. Your party has ${party.length} Pokemon.`)

        const [pokemon] = party.splice(idx - 1, 1)
        const pc = client.getPc ? await client.getPc(M.sender) : ((await client.poke.get(`${M.sender}_PSS`)) || [])
        pc.push(pokemon)

        await client.poke.set(`${M.sender}_Party`, party)
        if (client.setPc) await client.setPc(M.sender, pc)
        else await client.poke.set(`${M.sender}_PSS`, pc)

        return M.reply(`Transferred *${client.utils.capitalize(pokemon.name)}* to your PC. Party: ${party.length}/6, PC: ${pc.length}.`)
    }
}
