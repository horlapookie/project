module.exports = {
    name: 'shop',
    aliases: ['store'],
    category: 'pokemon',
    exp: 0,
    cool: 4,
    react: '🛒',
    usage: 'Use :shop',
    description: 'Alias for the Pokemon Mart',
    async execute(client, arg, M) {
        const martCommand = client.cmd.get('mart');
        if (!martCommand) {
            return M.reply('Pokemon Mart is not available right now.');
        }
        return martCommand.execute(client, arg, M);
    },
};
