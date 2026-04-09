const normalizeNumber = (value = '') => String(value).replace(/\D/g, '')

const resolveTarget = (arg, M) => {
    if (M.quoted?.participant) return normalizeNumber(M.quoted.participant.split('@')[0])
    if (M.mentions?.length) return normalizeNumber(M.mentions[0].split('@')[0])
    return normalizeNumber(arg)
}

module.exports = {
    name: 'delmod',
    aliases: ['rmod', 'removemod'],
    exp: 0,
    cool: 3,
    react: '✅',
    category: 'dev',
    usage: 'Use :delmod @user or :delmod 234xxxxxxxxx',
    description: 'Removes a moderator by tag, reply, or number',
    async execute(client, arg, M) {
        if (!client.isOwner(M)) {
            return M.reply('Only the owner can remove moderators.')
        }

        const target = resolveTarget(arg, M)
        if (!target) {
            return M.reply('Reply to a user, tag a user, or type a number to remove as mod.')
        }
        if (target === client.owner) {
            return M.reply('The owner cannot be removed from moderators.')
        }

        const mods = new Set(((await client.DB.get('mods')) || []).map(normalizeNumber).filter(Boolean))
        if (!mods.has(target)) {
            return M.reply(`*${target}* is not a moderator.`)
        }

        mods.delete(target)
        await client.DB.set('mods', Array.from(mods))
        await client.DB.delete(`mod-name-${target}`)
        await client.refreshMods()
        return M.reply(`Removed *${target}* from moderators.`)
    }
}
