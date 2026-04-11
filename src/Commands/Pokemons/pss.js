module.exports = {
    name: "pc",
    aliases: ["pc", "pss"],
    exp: 0,
    cool: 4,
    react: "📋",
    category: "pokemon",
    usage: 'Use :pc',
    description: "View your caught Pokémon in your PC",
    async execute(client, arg, M) {
        try {
            const pc = client.getPc ? await client.getPc(M.sender) : (await client.poke.get(`${M.sender}_PSS`)) || [];
            if (pc.length === 0) {
                return M.reply("📭 Your Pokémon storage is empty!");
            }
            const pushname = M.pushName.trim();
            let response = `📋 ${pushname}'s PC (pokemon storage):\n`;
            pc.forEach((pokemon, index) => {
                response += `${index + 1}. ${pokemon.name} (Level: ${pokemon.level})\n`;
            });

            await M.reply(response);
        } catch (err) {
            console.error(err);
            await client.sendMessage(M.from, {
                text: "An error occurred while retrieving your Pokémon collection."
            });
        }
    },
};
