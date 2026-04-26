const normalizeNumber = (value = '') => String(value).replace(/\D/g, '')

const resolveTarget = async (client, arg, M) => {
    const raw =
        M.quoted?.participant ||
        (M.mentions?.length ? M.mentions[0] : '') ||
        arg

    const jid = String(raw || '').trim()
    if (client.resolveNumber) {
        return await client.resolveNumber(jid)
    }
    return normalizeNumber(jid.split('@')[0])
}

module.exports = {
    name: 'delmod',
    aliases: ['rmod', 'removemod'],
    exp: 0,
    cool: 3,
    react: '✅',
    category: 'dev',
    usage: 'Use {prefix}delmod @user or :delmod 234xxxxxxxxx',
    description: 'Removes a moderator by tag, reply, or number',
    async execute(client, arg, M) {
        if (!client.isOwner(M) && !client.isOfficer(M)) {
            return M.reply('Only officers can remove moderators.')
        }

        const target = await resolveTarget(client, arg, M)
        if (!target) {
            return M.reply('Reply to a user, tag a user, or type a number to remove as mod.')
        }
        if (target === client.owner) {
            return M.reply('The owner cannot be removed from moderators.')
        }

        const mods = new Set(((await client.DB.get('mods')) || []).map(normalizeNumber).filter(Boolean))
        const isCurrentMod = mods.has(target) || (client.mods || []).includes(target)
        if (!isCurrentMod) {
            return M.reply(`*${target}* is not a moderator.`)
        }

        mods.delete(target)
        await client.DB.set('mods', Array.from(mods))
        // Add to deny-list so DEFAULT_MODS (env-baked) doesn't auto-restore them on next refresh.
        const removed = new Set(((await client.DB.get('mods-removed')) || []).map(normalizeNumber).filter(Boolean))
        removed.add(target)
        await client.DB.set('mods-removed', Array.from(removed))
        await client.DB.delete(`mod-name-${target}`)
        await client.refreshRoles?.()
        return M.reply(`Removed *${target}* from moderators.`)
    }
}
