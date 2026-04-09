module.exports = {
    name: 'owner',
    aliases: ['own'],
    category: 'general',
    react: "💬",
    description: 'Get information bot information',
    async execute(client, arg, M) {
        const owner = client.owner || '2347049044897'
        const text = `*Owner:* ${owner}\n*Role:* Primary controller of the bot\n*Commands:* Can add mods, remove mods, and manage all bot features.`
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
