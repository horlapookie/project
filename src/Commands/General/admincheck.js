module.exports = {
    name: 'admincheck',
    aliases: ['isadmin', 'botadmin'],
    category: 'general',
    exp: 0,
    cool: 4,
    react: '🧪',
    usage: 'Use {prefix}admincheck',
    description: 'Shows whether the bot detects itself as admin in this group',
    async execute(client, arg, M) {
        if (!M.isGroup) return M.reply('Use this in a group.')
        const meta = await client.groupMetadata(M.from)
        const members = meta?.participants || []
        const { areJidsSameUser } = require('@whiskeysockets/baileys')

        const normalizeNumber = (value = '') => String(value).replace(/\D/g, '')
        const stripDevice = (jid = '') => String(jid || '').replace(/:\d+(?=@)/, '')
        const getParticipantJid = (p) => stripDevice(p?.id || p?.jid || '')

        const botBase = normalizeNumber(String(client.user?.id || '').split('@')[0])
        const botCandidates = Array.from(
            new Set(
                [
                    client.user?.id,
                    stripDevice(client.user?.id),
                    client.meLid,
                    stripDevice(client.meLid),
                    client.user?.lid,
                    stripDevice(client.user?.lid),
                    botBase ? `${botBase}@s.whatsapp.net` : null,
                    botBase ? `${botBase}@lid` : null,
                    botBase || null
                ].filter(Boolean)
            )
        )

        const sameDigits = (a, b) => {
            const da = normalizeNumber(stripDevice(a).split('@')[0])
            const db = normalizeNumber(stripDevice(b).split('@')[0])
            return Boolean(da) && da === db
        }

        const find = (jid) =>
            members.find((p) => {
                const pid = getParticipantJid(p)
                const candidate = stripDevice(jid)
                return (
                    (pid && candidate && areJidsSameUser(pid, candidate)) ||
                    (pid && candidate && pid === candidate) ||
                    (pid && candidate && sameDigits(pid, candidate))
                )
            })

        const botP = botCandidates.map(find).find(Boolean)
        const isAdmin = Boolean(botP?.admin)

        return M.reply(
            `Bot admin check:\n\n- Bot id: ${client.user?.id}\n- Bot lid: ${client.meLid || client.user?.lid || 'N/A'}\n- Matched participant: ${botP?.id || 'NOT FOUND'}\n- participant.admin: ${String(botP?.admin)}\n\nResult: *${isAdmin ? 'BOT IS ADMIN' : 'BOT IS NOT ADMIN'}*`
        )
    }
}
