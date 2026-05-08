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
    name: 'addco',
    aliases: ['aco', 'addcoowner'],
    category: 'dev',
    exp: 0,
    cool: 3,
    react: '✅',
    usage: 'Use {prefix}addco @user or :addco 234xxxxxxxxx',
    description: 'Adds a co-owner (owner only).',
    async execute(client, arg, M) {
        if (!client.isOwner(M)) return M.reply('Only the owner can add co-owners.')

        const target = await resolveTarget(client, arg, M)
        if (!target.number) return M.reply('Reply to a user, mention them, or provide a number to add as co-owner.')
        if (target.number === client.owner) return M.reply('The owner is already a co-owner by default.')

        const coOwners = new Set(((await client.roleDB.get('coowner')) || []).map(normalizeNumber).filter(Boolean))
        if (coOwners.has(target.number)) return M.reply(`*${target.number}* is already a co-owner.`)

        coOwners.add(target.number)
        await client.roleDB.set('coowner', Array.from(coOwners))
        await client.roleDB.set(`coowner-name-${target.number}`, target.name || 'Unknown User')
        await client.refreshRoles?.()

        return M.reply(`Added *${target.name || target.number}* as a co-owner.`)
    }
}
