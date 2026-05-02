module.exports = {
    name: 'enable',
    aliases: ['e'],
    exp: 0,
    cool: 4,
    react: "✅",
    category: 'dev',
    description: 'Enables a previously disabled command.',
    async execute(client, arg, M) {
        try {
            if (!arg) {
                return M.reply('You need to provide the name of the command to enable.');
            }

            const input = arg.toLowerCase().trim();
            const disabledCommands = (await client.DB.get('disable-commands')) || [];

            const idx = disabledCommands.findIndex(cmd =>
                cmd.command === input ||
                (cmd.aliases && cmd.aliases.includes(input))
            );

            if (idx < 0) {
                return M.reply(`Command *${input}* is not currently disabled.`);
            }

            const cmdName = disabledCommands[idx].command;
            const updated = disabledCommands.filter((_, i) => i !== idx);
            await client.DB.set('disable-commands', updated);
            return M.reply(`Command *${cmdName}* has been enabled successfully.`);
        } catch (error) {
            console.error('Error in enabling command:', error);
            return M.reply('An error occurred while enabling the command.');
        }
    }
};
