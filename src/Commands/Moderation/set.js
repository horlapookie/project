module.exports = {
    name: 'set',
    aliases: [],
    exp: 10,
    cool: 4,
    react: "✅",
    category: 'moderation',
    usage: 'Use :set --<feature>=enable|disable',
    description: 'Enable or disable certain features in a group chat',
    async execute(client, arg, M) {
        if (!M.isGroup) return M.reply('This command can only be used in groups.')
        if (!client.isOwner(M) && !client.isMod(M)) {
            return M.reply('Only the bot owner or mods can toggle group features.')
        }

        const toggleableGroupActions = {
            'mod': 'Anti-link moderation (auto-removes members who send group links).',
            'events': 'Group events (join/leave/promote/demote announcements).',
            'cards': 'Card spawning in this group.',
            'wild': 'Wild Pokémon encounters.',
            'dungeon': 'Ashen Sanctum dungeon announcements.',
            'yugioh': 'Yu-Gi-Oh card spawning.',
            'nsfw': 'NSFW commands.'
        };

        if (!arg) {
            const actionsInfo = Object.entries(toggleableGroupActions)
                .map(([action, description]) => `*${action}*: ${description}`)
                .join('\n');
            return M.reply(`*Available toggleable features:*\n\n${actionsInfo}\n\n*Usage:* \`set --<feature>=enable|disable\`\nExample: \`set --wild=enable\``);
        }

        const regex = /--(.+?)=(enable|disable)/;
        const match = arg.match(regex);
        if (!match || !Object.prototype.hasOwnProperty.call(toggleableGroupActions, match[1])) {
            return M.reply(`Invalid feature. Use *${client.prefix}set* to see available features.`);
        }

        const item = match[1];
        const action = match[2];

        // Reliable enable/disable: get array, modify, set back
        let list = (await client.DB.get(item)) || [];
        if (!Array.isArray(list)) list = [];

        const isCurrentlyActive = list.includes(M.from);

        if (action === 'enable' && isCurrentlyActive) {
            return M.reply(`*${item}* is already enabled in this group.`);
        }
        if (action === 'disable' && !isCurrentlyActive) {
            return M.reply(`*${item}* is already disabled in this group.`);
        }

        if (action === 'enable') {
            list = [...list, M.from];
            await client.DB.set(item, list);
            return M.reply(`✅ *${item}* has been *enabled* in this group.\n\n_${toggleableGroupActions[item]}_`);
        } else {
            list = list.filter((jid) => jid !== M.from);
            await client.DB.set(item, list);
            return M.reply(`❌ *${item}* has been *disabled* in this group.\n\n_${toggleableGroupActions[item]}_`);
        }
    }
};
