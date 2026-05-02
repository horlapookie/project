const { getInventory } = require('../../Helpers/pokeballs');
const { getMegaStoneBag } = require('../../Helpers/megaStoneBag');

module.exports = {
    name: 'bags',
    aliases: ['bag'],
    exp: 0,
    cool: 3,
    react: '🎒',
    category: 'pokemon',
    usage: 'Use {prefix}bags',
    description: 'View the items in your trainer bag',
    async execute(client, arg, M) {
        const prefix = client.prefix || '-'
        const userKey = (await client.resolveNumber?.(M)) || client.getUserNumber?.(M) || M.sender.split('@')[0]

        const inventory  = await getInventory(client, M.sender);
        const stoneItems = await getMegaStoneBag(client, userKey);

        const totalBalls  = inventory.reduce((sum, item) => sum + item.quantity, 0);
        const totalStones = stoneItems.reduce((sum, item) => sum + item.quantity, 0);
        const username = M.pushName || 'Trainer';
        const tag = `#${M.sender.replace(/\D/g, '').slice(-5) || '00000'}`;

        const lines = [
            '🎒 *Trainer Bag*',
            '',
            ` 🏮 *Trainer:* ${username}`,
            ` 🧧 *Tag:* ${tag}`,
            '',
            '━━━━━━━━━━━━━━━━━━━━',
            `🎗 *Pokéballs*  (${totalBalls} total)`,
            '━━━━━━━━━━━━━━━━━━━━',
            ''
        ];

        inventory
            .filter((item) => item.quantity > 0)
            .forEach((item, index) => {
                lines.push(
                    `*#${index + 1}*  ${item.name} (x${item.quantity})`,
                    `  📝 ${item.description}`,
                    `  ➤ *${prefix}battle pokeballs use ${index + 1}*`,
                    ''
                );
            });

        if (!inventory.some((item) => item.quantity > 0)) {
            lines.push('No pokéballs in your bag yet.', '');
        }

        // ── Mega Stones & GMax Ball ──────────────────────────────────────────
        lines.push(
            '━━━━━━━━━━━━━━━━━━━━',
            `💎 *Mega Stones & GMax Ball*  (${totalStones} total)`,
            '━━━━━━━━━━━━━━━━━━━━',
            ''
        );

        if (stoneItems.length) {
            stoneItems.forEach((item, index) => {
                lines.push(
                    `*#${index + 1}*  ${item.emoji} *${item.name}* (x${item.quantity})`,
                    `  🎯 For: *${item.pokemon === 'gmax' ? 'Any GMax Pokémon' : client.utils.capitalize(item.pokemon)}*`,
                    `  📝 ${item.note}`,
                    `  ➤ *${prefix}equip #${index + 1}* to activate`,
                    ''
                );
            });
            lines.push(`⚠️ Only *one* Mega Boost can be active per party at a time.`);
        } else {
            lines.push(
                'No Mega Stones or GMax Balls in your bag yet.',
                `Buy them from the mart — use *${prefix}shop megastones* to browse.`
            );
        }

        return M.reply(lines.join('\n').trim());
    }
};
