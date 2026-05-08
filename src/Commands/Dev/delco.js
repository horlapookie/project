const normalizeNumber = (value = '') => String(value).replace(/\D/g, '')

const resolveTarget = async (client, arg, M) => {
    const raw = M.quoted?.participant || (M.mentions?.length ? M.mentions[0] : '') || arg
    const jid = String(raw || '').trim()
    if (!jid) return ''
    if (client.resolveNumber) return await client.resolveNumber(jid)
    return normalizeNumber(jid.split('@')[0])
}

module.exports = {
    name: 'delco',
    aliases: ['rco', 'removecoowner', 'removeco'],
    category: 'dev',
    exp: 0,
    cool: 3,
    react: '✅',
    usage: 'Use {prefix}delco @user or :delco 234xxxxxxxxx',
    description: 'Removes a co-owner (owner only).',
    async execute(client, arg, M) {
        if (!client.isOwner(M)) return M.reply('Only the owner can remove co-owners.')

        const target = await resolveTarget(client, arg, M)
        if (!target) return M.reply('Reply to a user, mention them, or provide a number to remove as co-owner.')
        if (String(target) === String(client.owner)) return M.reply('The owner cannot be removed.')

        const coOwners = new Set(((await client.roleDB.get('coowner')) || []).map(normalizeNumber).filter(Boolean))
        if (!coOwners.has(target)) return M.reply(`*${target}* is not a co-owner.`)

        coOwners.delete(target)
        await client.roleDB.set('coowner', Array.from(coOwners))
        await client.roleDB.delete(`coowner-name-${target}`)
        await client.refreshRoles?.()

        return M.reply(`Removed *${target}* from co-owners.`)
    }
}
