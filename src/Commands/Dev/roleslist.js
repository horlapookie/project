const normalizeNumber = (value = '') => String(value).replace(/\D/g, '')

const formatList = async (client, numbers, keyPrefix) => {
    const lines = []
    for (const number of numbers) {
        const jid = `${number}@s.whatsapp.net`
        const contact = await client.contact.getContact(jid, client).catch(() => null)
        const savedName = await client.DB.get(`${keyPrefix}-name-${number}`).catch(() => null)
        const username =
            savedName && typeof savedName === 'string'
                ? savedName.trim()
                : contact?.username && typeof contact.username === 'string'
                  ? contact.username.trim()
                  : 'Unknown User'

        lines.push(`- ${username} (wa.me/${number})`)
    }
    return lines
}

module.exports = {
    name: 'roleslist',
    aliases: ['roles', 'staff'],
    category: 'dev',
    exp: 0,
    cool: 5,
    react: '📜',
    usage: 'Use {prefix}roleslist',
    description: 'Lists officers and moderators',
    async execute(client, arg, M) {
        if (!client.isStaff?.(M)) return M.reply('This command can only be used by staff.')

        await client.refreshRoles?.()

        const owner = normalizeNumber(client.owner || '')
        const officers = (client.officers || []).map(normalizeNumber).filter(Boolean).filter((n) => n !== owner)
        const mods = (client.mods || []).map(normalizeNumber).filter(Boolean).filter((n) => n !== owner)
        const pureMods = mods.filter((n) => !officers.includes(n))

        const officerLines = await formatList(client, officers, 'sudo')
        const modLines = await formatList(client, pureMods, 'mod')

        const text = [
            `*${client.name || 'Eternal'} roleslist*`,
            '',
            `*Officers:* ${officers.length}`,
            ...(officerLines.length ? officerLines : ['- None']),
            '',
            `*Moderators:* ${pureMods.length}`,
            ...(modLines.length ? modLines : ['- None'])
        ].join('\n')

        return M.reply(text)
    }
}

