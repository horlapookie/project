const normalizeNumber = (value = '') => String(value).replace(/\D/g, '')

const resolveTarget = async (client, arg, M) => {
    if (M.quoted?.participant) {
        const quotedJid = M.quoted.participant
        let number = normalizeNumber(quotedJid.split('@')[0])
        if (quotedJid.endsWith('@lid')) {
            const mapped = normalizeNumber((await client.DB.get(`lid-map-${number}`)) || '')
            if (mapped) number = mapped
        }
        const contact = await client.contact.getContact(M.quoted.participant, client).catch(() => null)
        return { number, name: contact?.username || 'Unknown User' }
    }
    if (M.mentions?.length) {
        const mention = M.mentions[0]
        let number = normalizeNumber(mention.split('@')[0])
        if (mention.endsWith('@lid')) {
            const mapped = normalizeNumber((await client.DB.get(`lid-map-${number}`)) || '')
            if (mapped) number = mapped
        }
        const contact = await client.contact.getContact(mention, client).catch(() => null)
        return { number, name: contact?.username || 'Unknown User' }
    }
    return { number: normalizeNumber(arg), name: 'Unknown User' }
}

module.exports = {
    name: 'addmod',
    aliases: ['amod'],
    exp: 0,
    cool: 3,
    react: '✅',
    category: 'dev',
    usage: 'Use :addmod @user or :addmod 234xxxxxxxxx',
    description: 'Adds a moderator by tag, reply, or number',
    async execute(client, arg, M) {
        if (!client.isOwner(M)) {
            return M.reply('Only the owner can add moderators.')
        }

        const target = await resolveTarget(client, arg, M)
        if (!target.number) {
            return M.reply('Reply to a user, tag a user, or type a number to add as mod.')
        }

        const mods = new Set(((await client.DB.get('mods')) || []).map(normalizeNumber).filter(Boolean))
        mods.add(client.owner)
        if (mods.has(target.number)) {
            return M.reply(`*${target.number}* is already a moderator.`)
        }

        mods.add(target.number)
        await client.DB.set('mods', Array.from(mods))
        await client.DB.set(`mod-name-${target.number}`, target.name || 'Unknown User')
        await client.refreshMods()
        return M.reply(`Added *${target.name || target.number}* as a moderator.`)
    }
}
