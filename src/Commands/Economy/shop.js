const { POTIONS } = require('../../Helpers/potions')

module.exports = {
    name: 'shop',
    aliases: ['store'],
    category: 'economy',
    exp: 0,
    cool: 4,
    react: '🛒',
    usage: 'Use {prefix}shop',
    description: 'View items available in the economy shop',
    async execute(client, arg, M) {
        const prefix = client.prefix || '-'

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
            `💡 View your potion bag in battle with *${prefix}battle potion*`,
            `💡 Use a potion in battle with *${prefix}battle potion use <#>*`
        )

        return M.reply(lines.join('\n').trim())
    },
}
