module.exports = {
    name: 'disable',
    aliases: ['d'],
    exp: 0,
    cool: 4,
    react: "✅",
    category: 'dev',
    description: 'Disables a certain command. Usage: disable <command> | <reason>',
    async execute(client, arg, M) {
        try {
            if (!arg || typeof arg !== 'string') {
                return M.reply('You need to provide the name of the command to disable.\nUsage: disable <command> | <reason>');
            }

            const [commandName, ...reasonParts] = arg.split('|').map(part => part.trim().toLowerCase());
            const reason = reasonParts.join('|').trim() || 'No reason provided';

            if (!commandName) {
                return M.reply('You need to provide the name of the command to disable.');
            }

            const command = client.cmd.get(commandName) || client.cmd.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
            if (!command) {
                return M.reply(`Command *${commandName}* not found.`);
            }

            const disabledCommands = (await client.DB.get('disable-commands')) || [];

            if (disabledCommands.some(cmd => cmd.command === command.name)) {
                return M.reply(`Command *${command.name}* is already disabled.`);
            }

            const entry = {
                command: command.name,
                reason,
                disabledAt: new Date().toISOString(),
                disabledBy: M.pushName
            };

            const updated = [...disabledCommands, entry];
            await client.DB.set('disable-commands', updated);
            return M.reply(`Command *${command.name}* has been disabled by *${M.pushName}*.\nReason: ${reason}`);
        } catch (error) {
            console.error('Error in disabling command:', error);
            return M.reply('An error occurred while disabling the command.');
        }
    }
};
