const normalizeNumber = (value = '') => String(value).replace(/\D/g, '')

module.exports = {
    name: 'roleslist',
    aliases: ['roles', 'staff'],
    category: 'dev',
    exp: 0,
    cool: 5,
    react: '📜',
    usage: 'Use {prefix}roleslist',
    description: 'Lists officers and moderators with mentions',
    async execute(client, arg, M) {
        if (!client.isStaff?.(M)) return M.reply('This command can only be used by staff.')

        await client.refreshRoles?.()

        const owner = normalizeNumber(client.owner || '')
        const officers = (client.officers || []).map(normalizeNumber).filter(Boolean).filter((n) => n !== owner)
        const mods = (client.mods || []).map(normalizeNumber).filter(Boolean).filter((n) => n !== owner)
        const pureMods = mods.filter((n) => !officers.includes(n))

        const mentions = []
        const officerLines = []
        const modLines = []

        for (let i = 0; i < officers.length; i++) {
            const number = officers[i]
            const jid = `${number}@s.whatsapp.net`
            const savedName = await client.roleDB.get(`sudo-name-${number}`).catch(() => null)
            const contact = await client.contact.getContact(jid, client).catch(() => null)
            const username = savedName && typeof savedName === 'string'
                ? savedName.trim()
                : contact?.username && typeof contact.username === 'string'
                ? contact.username.trim()
                : 'Unknown User'
            mentions.push(jid)
            officerLines.push(`*${i + 1}.* @${number} (${username})`)
        }

        for (let i = 0; i < pureMods.length; i++) {
            const number = pureMods[i]
            const jid = `${number}@s.whatsapp.net`
            const savedName = await client.roleDB.get(`mod-name-${number}`).catch(() => null)
            const contact = await client.contact.getContact(jid, client).catch(() => null)
            const username = savedName && typeof savedName === 'string'
                ? savedName.trim()
                : contact?.username && typeof contact.username === 'string'
                ? contact.username.trim()
                : 'Unknown User'
            mentions.push(jid)
            modLines.push(`*${i + 1}.* @${number} (${username})`)
        }

        const ownerJid = `${owner}@s.whatsapp.net`
        if (owner) mentions.push(ownerJid)

        const text = [
            `*${client.name || 'Eternal'} — Staff Roles*`,
            '',
            `*👑 Owner:* @${owner}`,
            '',
            `*🛡 Officers:* ${officers.length}`,
            ...(officerLines.length ? officerLines : ['- None']),
            '',
            `*⚔️ Moderators:* ${pureMods.length}`,
            ...(modLines.length ? modLines : ['- None'])
        ].join('\n')

        return client.sendMessage(
            M.from,
            {
                text,
                mentions
            },
            { quoted: M }
        )
    }
}
