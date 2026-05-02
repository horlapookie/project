const { POTIONS } = require('../../Helpers/potions')
const { MEGA_STONES, GMAX_BALL } = require('../../Helpers/megaItems')

module.exports = {
    name: 'shop',
    aliases: ['store'],
    category: 'economy',
    exp: 0,
    cool: 4,
    react: '🛒',
    usage: 'Use {prefix}shop  OR  {prefix}shop megastones',
    description: 'View items available in the economy shop',
    async execute(client, arg, M) {
        const prefix = client.prefix || '-'
        const isMegaView = /mega(stone)?s?/i.test(arg || '')

        // ── Mega Stones sub-view ──────────────────────────────────────────────
        if (isMegaView) {
            const lines = [
                '💎 *MEGA STONE SHOP* 💎',
                '',
                '━━━━━━━━━━━━━━━━━━━━',
                '🔑 *How it works:*',
                '  1. Buy a stone for your specific Mega Pokémon',
                '  2. Use *-equip* to see stones in your bag',
                '  3. Use *-equip #N* to apply it — stats boost permanently',
                `  ⚠️ Only *ONE* stone can be active per party`,
                '━━━━━━━━━━━━━━━━━━━━',
                ''
            ]

            for (const s of MEGA_STONES) {
                lines.push(
                    `*#${s.id}*  ${s.emoji} *${s.name}*`,
                    `  🎯 Pokémon: *${client.utils.capitalize(s.pokemon)}*`,
                    `  📊 ${s.note}`,
                    `  💎 *${s.price.toLocaleString()}* gems`,
                    `  ➤ *${prefix}mart-buy #${s.id}*`,
                    ''
                )
            }

            lines.push(
                '━━━━━━━━━━━━━━━━━━━━',
                `🌀 *#${GMAX_BALL.id}*  ${GMAX_BALL.emoji} *${GMAX_BALL.name}*`,
                `  🎯 Works on: *Any GMax Pokémon*`,
                `  📊 ${GMAX_BALL.note}`,
                `  💎 *${GMAX_BALL.price.toLocaleString()}* gems`,
                `  ➤ *${prefix}mart-buy #${GMAX_BALL.id}*`,
            )

            return M.reply(lines.join('\n').trim())
        }

        // ── Main shop view ────────────────────────────────────────────────────
        const lines = [
            '🛒 *SHOP* 🛒',
            '',
            '━━━━━━━━━━━━━━━━━━━━',
            '🧪 *Economy Items*',
            '━━━━━━━━━━━━━━━━━━━━',
            '',
            '*#1*',
            '🎈 *Item:* Luck Potion',
            '🧧 *Description:* Increases luck in slotting.',
            '💎 *Price:* 15,000',
            '',
            '*#2*',
            '🎈 *Item:* Pepper Spray',
            '🧧 *Description:* Self-defense against robbers.',
            '💎 *Price:* 10,000',
            '',
            `*[Use ${prefix}buy luckpotion 1]*`,
            `*[Use ${prefix}buy pepperspray 1]*`,
            '',
            '━━━━━━━━━━━━━━━━━━━━',
            '⚗️ *Battle Potions*  (use in battle to boost your Pokémon)',
            '━━━━━━━━━━━━━━━━━━━━',
            '📌 Max *3 uses* per battle  |  Buy with *mart-buy #ID*',
            ''
        ]

        for (const p of POTIONS) {
            lines.push(
                `*#${p.id}*  ${p.emoji} *${p.name}*`,
                `  🔹 Effect: ${p.label}  —  ${p.description}`,
                `  💎 Price: *${p.price.toLocaleString()}* gems`,
                `  ➤ *${prefix}mart-buy #${p.id} --quantity=1*`,
                ''
            )
        }

        lines.push(
            '━━━━━━━━━━━━━━━━━━━━',
            '💎 *Mega Stones & GMax Ball*',
            '━━━━━━━━━━━━━━━━━━━━',
            `  Equip Mega Stones to permanently boost your Mega Pokémon's stats.`,
            `  One GMax Ball works on *all* GMax Pokémon.`,
            `  ➤ *${prefix}shop megastones* — browse all ${MEGA_STONES.length} Mega Stones + GMax Ball`,
            '',
            '━━━━━━━━━━━━━━━━━━━━',
            `💡 Battle potions: *${prefix}battle potion*  |  Use: *${prefix}battle potion use <#>*`,
            `💡 Equip stones:   *${prefix}equip*  |  Apply: *${prefix}equip #N*`,
        )

        return M.reply(lines.join('\n').trim())
    },
}
