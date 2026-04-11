const normalizeNumber = (value = '') => String(value).replace(/\D/g, '')

const resolveTarget = async (client, arg, M) => {
    if (M.quoted?.participant) {
        const quotedJid = M.quoted.participant
        const number = client.resolveNumber ? await client.resolveNumber(quotedJid) : normalizeNumber(quotedJid.split('@')[0])
        const contact = await client.contact.getContact(quotedJid, client).catch(() => null)
        return { number, name: contact?.username || 'Unknown User' }
    }
    if (M.mentions?.length) {
        const mention = M.mentions[0]
        const number = client.resolveNumber ? await client.resolveNumber(mention) : normalizeNumber(mention.split('@')[0])
        const contact = await client.contact.getContact(mention, client).catch(() => null)
        return { number, name: contact?.username || 'Unknown User' }
    }
    return { number: normalizeNumber(arg), name: 'Unknown User' }
}

module.exports = {
    name: 'addsudo',
    aliases: ['asudo', 'addofficer', 'aofficer'],
    exp: 0,
    cool: 3,
    react: '✅',
    category: 'dev',
    usage: 'Use :addsudo @user or :addsudo 234xxxxxxxxx',
    description: 'Adds an officer (sudo) by tag, reply, or number',
    async execute(client, arg, M) {
        if (!client.isOwner(M)) return M.reply('Only the owner can add officers.')

        const target = await resolveTarget(client, arg, M)
        if (!target.number) return M.reply('Reply to a user, tag a user, or type a number to add as officer.')

        const owner = client.owner || normalizeNumber(process.env.OWNER || '')
        if (target.number === owner) return M.reply('The owner is already staff.')

        const officers = new Set(((await client.DB.get('sudo')) || []).map(normalizeNumber).filter(Boolean))
        if (officers.has(target.number)) return M.reply(`*${target.number}* is already an officer.`)

        officers.add(target.number)
        await client.DB.set('sudo', Array.from(officers))
        await client.DB.set(`sudo-name-${target.number}`, target.name || 'Unknown User')
        await client.refreshRoles?.()

        return M.reply(`Added *${target.name || target.number}* as an officer.`)
    }
}

