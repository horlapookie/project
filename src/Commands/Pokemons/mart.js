const { MART_ITEMS } = require('../../Helpers/martItems');

module.exports = {
    name: 'mart',
    aliases: ['pokemonmart', 'pmart'],
    exp: 0,
    cool: 4,
    react: '🛒',
    category: 'pokemon',
    usage: 'Use :mart',
    description: 'View pokeballs available in the Pokemon Mart',
    async execute(client, arg, M) {
        const battle = client.pokemonBattleResponse.get(M.from)
        if (battle && (battle.players?.includes(M.sender) || battle.player1?.user === M.sender)) {
            return M.reply('You cannot use the mart while you are battling. Finish the battle first.')
        }

        const lines = [
            '🛒 *Pokemon Mart* 🛒',
            '',
            '📘 *Current Page:* 1',
            '📕 *Total Pages:* 1',
            ''
        ];

        for (const item of MART_ITEMS) {
            lines.push(
                `*#${item.id}*`,
                `❓ *ID:* ${item.id}`,
                `🎈 *Item:* ${item.name}`,
                `🧧 *Description:* ${item.description}`,
                `💰 *Price:* ${item.price}`,
                ''
            );
        }

        lines.push(`*[Use ${client.prefix}mart-buy #<ID> --quantity=1 to buy an item]*`);
        return M.reply(lines.join('\n').trim());
    }
};
