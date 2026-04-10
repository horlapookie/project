module.exports = {
    name: 'admincheck',
    aliases: ['isadmin', 'botadmin'],
    category: 'general',
    exp: 0,
    cool: 4,
    react: '🧪',
    usage: 'Use :admincheck',
    description: 'Shows whether the bot detects itself as admin in this group',
    async execute(client, arg, M) {
        if (!M.isGroup) return M.reply('Use this in a group.')
        const meta = await client.groupMetadata(M.from)
        const members = meta?.participants || []
        const { areJidsSameUser } = require('@whiskeysockets/baileys')

        const botBase = String(client.user?.id || '').split(':')[0]
        const botCandidates = [client.user?.id, client.meLid, client.user?.lid, `${botBase}@s.whatsapp.net`, `${botBase}@lid`].filter(Boolean)
        const find = (jid) => members.find((p) => p?.id && areJidsSameUser(p.id, jid))
        const botP = botCandidates.map(find).find(Boolean)
        const isAdmin = Boolean(botP?.admin)

        return M.reply(
            `Bot admin check:\n\n- Bot id: ${client.user?.id}\n- Bot lid: ${client.meLid || client.user?.lid || 'N/A'}\n- Matched participant: ${botP?.id || 'NOT FOUND'}\n- participant.admin: ${String(botP?.admin)}\n\nResult: *${isAdmin ? 'BOT IS ADMIN' : 'BOT IS NOT ADMIN'}*`
        )
    }
}
