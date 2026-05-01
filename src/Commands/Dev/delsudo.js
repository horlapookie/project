const normalizeNumber = (value = '') => String(value).replace(/\D/g, '')

const resolveTarget = async (client, arg, M) => {
    const raw = M.quoted?.participant || (M.mentions?.length ? M.mentions[0] : '') || arg
    const jid = String(raw || '').trim()
    if (!jid) return ''
    if (client.resolveNumber) return await client.resolveNumber(jid)
    return normalizeNumber(jid.split('@')[0])
}

module.exports = {
    name: 'delsudo',
    aliases: ['rsudo', 'delofficer', 'rofficer', 'removesudo'],
    exp: 0,
    cool: 3,
    react: '✅',
    category: 'dev',
    usage: 'Use {prefix}delsudo @user or :delsudo 234xxxxxxxxx',
    description: 'Removes an officer (sudo) by tag, reply, or number',
    async execute(client, arg, M) {
        if (!client.isOwner(M)) return M.reply('Only the owner can remove officers.')

        const target = await resolveTarget(client, arg, M)
        if (!target) return M.reply('Reply to a user, tag a user, or type a number to remove as officer.')
        if (String(target) === String(client.owner)) return M.reply('The owner cannot be removed from staff.')

        const officers = new Set(((await client.roleDB.get('sudo')) || []).map(normalizeNumber).filter(Boolean))
        if (!officers.has(target)) return M.reply(`*${target}* is not an officer.`)

        officers.delete(target)
        await client.roleDB.set('sudo', Array.from(officers))
        await client.roleDB.delete(`sudo-name-${target}`)
        await client.refreshRoles?.()
        return M.reply(`Removed *${target}* from officers.`)
    }
}

