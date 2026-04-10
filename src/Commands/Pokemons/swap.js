module.exports = {
    name: 'swap',
    aliases: ['swapparty'],
    exp: 2,
    cool: 4,
    react: '🔁',
    category: 'pokemon',
    usage: 'Use :swap 1 3',
    description: 'Swap two Pokemon positions in your party (only outside battles)',
    async execute(client, arg, M) {
        const battle = client.pokemonBattleResponse.get(M.from)
        if (battle && (battle.players?.includes(M.sender) || battle.player1?.user === M.sender)) {
            return M.reply('You cannot swap party order while you are battling.')
        }

        const parts = String(arg || '').trim().split(/\s+/).filter(Boolean)
        const a = parseInt(parts[0], 10)
        const b = parseInt(parts[1], 10)
        if (!a || !b) {
            return M.reply(`Use *${client.prefix}swap 1 3*`)
        }

        if (a === b) return M.reply('Pick two different party slots to swap.')

        const party = (await client.poke.get(`${M.sender}_Party`)) || []
        if (!party.length) return M.reply("You don't have any Pokemon in your party.")
        if (a < 1 || b < 1 || a > party.length || b > party.length) {
            return M.reply(`Invalid party slots. Your party has ${party.length} Pokemon.`)
        }

        const i = a - 1
        const j = b - 1
        const first = party[i]
        const second = party[j]
        party[i] = second
        party[j] = first

        await client.poke.set(`${M.sender}_Party`, party)

        return M.reply(
            `Swapped slot *${a}* (${client.utils.capitalize(first.name)}) with slot *${b}* (${client.utils.capitalize(second.name)}).`
        )
    }
}

