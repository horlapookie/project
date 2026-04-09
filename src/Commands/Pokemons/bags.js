const { getInventory } = require('../../Helpers/pokeballs');

module.exports = {
    name: 'bags',
    aliases: ['bag'],
    exp: 0,
    cool: 3,
    react: '🎒',
    category: 'pokemon',
    usage: 'Use :bags',
    description: 'View the items in your trainer bag',
    async execute(client, arg, M) {
        const inventory = await getInventory(client, M.sender);
        const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
        const username = M.pushName || 'Trainer';
        const tag = `#${M.sender.replace(/\D/g, '').slice(-5) || '00000'}`;

        const lines = [
            '🎒 *Bag*',
            '',
            '🎴 *ID:*',
            ` 🏮 *Username:* ${username}`,
            ` 🧧 *Tag:* ${tag}`,
            '',
            '🎗 *Category:* Pokeballs',
            `〽 *Total Items:* ${totalItems}`,
            ''
        ];

        inventory
            .filter((item) => item.quantity > 0)
            .forEach((item, index) => {
                lines.push(
                    `*#${index + 1}*`,
                    `🎈 *Item:* ${item.name} (x${item.quantity})`,
                    `🧧 *Description:* ${item.description}`,
                    `*[Use ${client.prefix}battle pokeballs use ${index + 1} to use this pokeball]*`,
                    ''
                );
            });

        if (!inventory.some((item) => item.quantity > 0)) {
            lines.push('You do not have any pokeballs in your bag yet.');
        }

        return M.reply(lines.join('\n').trim());
    }
};
