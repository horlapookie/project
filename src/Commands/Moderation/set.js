module.exports = {
    name: 'set',
    aliases: [],
    exp: 10,
    cool: 4,
    react: "✅",
    category: 'moderation',
    usage: 'Use :set --<toggleable_function>=[enble/disable]',
    description: 'Enable or disable certain features on group-chats',
    async execute(client, arg, M) {
        const toggleableGroupActions = {
            'mod': 'This features helps to auto remove a member from the group if he/she have sended a different group link also delete the link.',
            'events': 'This helps to turn on events where if any member joins, leaves, promoted or demoted eill be shown.',
            'cards': 'This function enables card spawning in your group.',
            'wild': 'This feature enable wild pokemon encounters.'
        };

        if (!arg) {
            const actionsInfo = Object.entries(toggleableGroupActions)
                .map(([action, description]) => `\`${action}\`: ${description}`)
                .join('\n');
            return M.reply(`Please provide a valid toggleable item and action.\n\n*Available Items and Descriptions:*\n${actionsInfo}\n\n*Usage:*\n\`set --<toggleableItem>=<enable/disable>\``);
        }

        const regex = /--(.+?)=(enable|disable)/;
        const match = arg.match(regex);
        if (!match || !toggleableGroupActions.hasOwnProperty(match[1])) {
            return M.reply(`Invalid toggleable item provided. Please provide a valid item. For available items, use \`set\`.`);
        }

        const item = match[1];
        const action = match[2];

        const Actives = (await client.DB.get(item)) || [];
        const isCurrentlyActive = Actives.includes(M.from);

        if ((action === 'enable' && isCurrentlyActive) || (action === 'disable' && !isCurrentlyActive)) {
            const actionText = action === 'enable' ? 'activated' : 'deactivated';
            return M.reply(`${toggleableGroupActions[item]} is already ${actionText} in your group.`);
        }

        if (action === 'enable') {
            await client.DB.push(item, M.from);
            M.reply(`${toggleableGroupActions[item]} successfully activated in your group.`);
        } else if (action === 'disable') {
            await client.DB.pull(item, M.from);
            M.reply(`${toggleableGroupActions[item]} successfully deactivated in your group.`);
        }
    }
};
