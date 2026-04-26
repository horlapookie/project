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
        const lines = [
            '🛒 *Shop* 🛒',
            '',
            '*#1*',
            '🎈 *Item:* Luck Potion',
            '🧧 *Description:* Increases luck in slotting.',
            '💎 *Price:* 15000',
            '',
            '*#2*',
            '🎈 *Item:* Pepper Spray',
            '🧧 *Description:* Self-defense against robbers.',
            '💎 *Price:* 10000',
            '',
            `*[Use ${client.prefix}buy luckpotion 1]*`,
            `*[Use ${client.prefix}buy pepperspray 1]*`
        ]
        return M.reply(lines.join('\n').trim())
    },
};
