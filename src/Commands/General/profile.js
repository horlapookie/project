const { getStats, getLevelFromXp } = require('../../Helpers/Stats');
const { getInventory } = require('../../Helpers/pokeballs');

module.exports = {
    name: 'profile',
    aliases: ['p'],
    category: 'general',
    exp: 5,
    cool: 4,
    react: "👀",
    usage: 'Use :p to get your profile',
    description: 'Gives you your stats',
    async execute(client, arg, M) {
        const groupMetadata = await client.groupMetadata(M.from);
        const groupMembers = groupMetadata?.participants || [];
        const groupAdmins = groupMembers.filter((v) => v.admin).map((v) => v.id);
        const user = M.quoted?.participant || M.mentions[0] || M.sender;
         const deck = await client.DB.get(`${user}_Deck`) || [];
        const userId = M.quoted?.participant || M.mentions[0] || M.sender;
        const economy = await client.getEcon(userId);

        let wallet = economy ? economy.gem : 0;
        
        let pfp;
        try {
            pfp = await client.profilePictureUrl(user, 'image');
        } catch {
            pfp = 'https://i.ibb.co/BVpbBJm/Picsart-24-05-18-15-10-43-623.jpg';
        }

        let bio;
        try {
            bio = (await client.fetchStatus(user)).status;
        } catch {
            bio = 'None'; // Set to 'None' if no bio is available
        }

        const experience = (await client.exp.get(user)) || 0;
        const level = getLevelFromXp(experience);
        await client.DB.set(`${user}_LEVEL`, level);
        const stats = getStats(level);

        // Compute global XP rank (position on the leaderboard)
        let globalPosition = 'Unranked';
        try {
            const all = (await client.exp.all()) || [];
            const sorted = all
                .filter((x) => x && x.id)
                .map((x) => ({ id: x.id, value: Number(x.value || 0) }))
                .sort((a, b) => b.value - a.value);
            const myDigits = String(user).replace(/\D/g, '');
            const idx = sorted.findIndex((x) => String(x.id).replace(/\D/g, '') === myDigits);
            if (idx >= 0) globalPosition = `#${idx + 1} of ${sorted.length}`;
        } catch (_) {
            globalPosition = 'Unranked';
        }

        // Pokeball totals
        let totalPokeballs = 0;
        try {
            const userKey = (await client.resolveNumber?.(user)) || String(user).replace(/\D/g, '') || user;
            const items = await getInventory(client, userKey);
            totalPokeballs = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
        } catch (_) {
            totalPokeballs = 0;
        }

        const username = M.pushName
        const banned = (await client.DB.get('banned')) || [];

        let text = '';
        text += `*┏─═━══─|🎀 ᴘʀᴏғɪʟᴇ 🎀|─══━═─∘⦿ꕹ᛫*\n`;
        text += `*╏🏮 Username:* ${username}\n`;
        text += `*╏🎫 Bio:* ${bio}\n`;
        text += `*╏🍀 Level:* ${level}\n`;
        text += `*╏🌟 XP:* ${experience}\n`;
        text += `*╏🥇 Title:* ${stats.rank}\n`;
        text += `*╏📊 Global Rank:* ${globalPosition}\n`;
        text += `*╏👑 Admin:* ${groupAdmins.includes(user) ? 'True' : 'False'}\n`;
        text += `*╏✖ Ban:* ${banned.includes(user) ? 'True' : 'False'}\n`;
        text += `*╏💰 Wallet:* ${Number(wallet).toLocaleString()}\n`;
        text += `*╏🎯 Pokeballs:* ${totalPokeballs}\n`;
        text += `*╏🃏 Deck:* ${deck ? deck.length : 0}\n`;
        text += `*┗─═━══─|🎀 ᴘʀᴏғɪʟᴇ 🎀|─══━═─∘⦿ꕹ᛫*\n`;

        client.sendMessage(
            M.from,
            {
                image: {
                    url: pfp
                },
                caption: text
            },
            {
                quoted: M
            }
        );
    }
};
