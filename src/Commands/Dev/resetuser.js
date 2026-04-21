const normalizeNumber = (value = '') => String(value).replace(/\D/g, '')

const resolveTarget = async (client, arg, M) => {
    const raw =
        M.quoted?.participant ||
        (M.mentions?.length ? M.mentions[0] : '') ||
        arg

    const jid = String(raw || '').trim()
    if (!jid) return null

    const number = client.resolveNumber
        ? await client.resolveNumber(jid)
        : normalizeNumber(jid.split('@')[0])
    if (!number) return null
    return {
        number,
        // The party / deck / collection are stored under the original jid form
        // (e.g. `2349xxx@s.whatsapp.net` or `xxx@lid`). We need to clear all of them.
        candidateJids: Array.from(new Set([
            jid.includes('@') ? jid : `${number}@s.whatsapp.net`,
            `${number}@s.whatsapp.net`,
            `${number}@lid`
        ])).filter(Boolean)
    }
}

module.exports = {
    name: 'resetuser',
    aliases: ['userreset', 'wipeuser'],
    exp: 0,
    cool: 5,
    react: '♻️',
    category: 'dev',
    usage: 'Use :resetuser @user --confirm',
    description: 'Wipes a user’s pokemon, cards, XP and economy (owner / officer only)',
    async execute(client, arg, M) {
        if (!client.isOwner(M) && !client.isOfficer(M)) {
            return M.reply('Only the owner or officers can reset a user.')
        }

        const args = String(arg || '').trim()
        const confirmed = /\s--confirm\b/.test(` ${args} `)
        const cleanArg = args.replace(/--confirm/g, '').trim()

        const target = await resolveTarget(client, cleanArg, M)
        if (!target) {
            return M.reply('Reply to, tag, or type the number of the user you want to reset.')
        }
        if (target.number === client.owner) {
            return M.reply('You cannot reset the owner.')
        }

        if (!confirmed) {
            return M.reply(
                `⚠️ This will *permanently delete* the user’s Pokemon party, PC, deck, card collection, XP, level and wallet/treasury.\n\n` +
                `If you really want to reset *${target.number}*, run:\n` +
                `*${client.prefix}resetuser ${target.number} --confirm*`
            )
        }

        const summary = { keysCleared: 0 }
        const safeDel = async (fn, key) => {
            try {
                await fn(key)
                summary.keysCleared += 1
            } catch (_) {
                // ignore individual delete errors
            }
        }

        for (const jid of target.candidateJids) {
            // Pokemon data
            await safeDel((k) => client.poke.delete(k), `${jid}_Party`)
            await safeDel((k) => client.poke.delete(k), `${jid}_PSS`)
            await safeDel((k) => client.poke.delete(k), `${jid}_PC`)
            await safeDel((k) => client.poke.delete(k), `${jid}_Pss`)
            // Cards
            await safeDel((k) => client.DB.delete(k), `${jid}_Deck`)
            await safeDel((k) => client.DB.delete(k), `${jid}_Collection`)
            // XP / level
            try { await client.exp.delete(jid); summary.keysCleared += 1 } catch (_) {}
            await safeDel((k) => client.DB.delete(k), `${jid}_LEVEL`)
            // Ashen win counter
            await safeDel((k) => client.DB.delete(k), `ashen-wins-${jid}`)
        }

        // Pokeball inventory + economy keyed by phone number digits
        await safeDel((k) => client.DB.delete(k), `pokeballs-${target.number}`)
        await safeDel((k) => client.DB.delete(k), `pokeball-inv-${target.number}`)

        // Economy: delete every doc that matches the user
        try {
            const candidateIds = [
                target.number,
                ...target.candidateJids
            ]
            const res = await client.econ.deleteMany({ userId: { $in: candidateIds } })
            summary.keysCleared += Number(res?.deletedCount || 0)
        } catch (_) {
            // ignore economy errors
        }

        return M.reply(
            `♻️ *${target.number}* has been reset.\n` +
            `Pokemon party, PC, deck, collection, XP, level, pokeballs, ashen wins and economy have been wiped.\n` +
            `(${summary.keysCleared} stored keys cleared.)`
        )
    }
}
