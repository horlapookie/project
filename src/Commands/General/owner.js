module.exports = {
    name: 'owner',
    aliases: ['own'],
    category: 'general',
    react: "💬",
    description: 'Get information bot information',
    async execute(client, arg, M) {
        const text = `This bot is privately managed.\n\nUse *${client.prefix}support* for the official groups.`
        return client.sendMessage(
            M.from,
            {
                image: { url: `${process.cwd()}/assets/Images/battle.png` },
                caption: text
            },
            { quoted: M }
        )
    }
}; 
