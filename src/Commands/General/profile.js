const { getStats, getLevelFromXp } = require('../../Helpers/Stats');
const { getInventory } = require('../../Helpers/pokeballs');

module.exports = {
    name: 'profile',
    aliases: ['p'],
    category: 'general',
    exp: 5,
    cool: 4,
    react: "👀",
    usage: 'Use {prefix}p to get your profile',
    description: 'Gives you your stats',
    async execute(client, arg, M) {
        const groupMetadata = await client.groupMetadata(M.from);
        const groupMembers = groupMetadata?.participants || [];
        const groupAdmins = groupMembers.filter((v) => v.admin).map((v) => v.id);

        const rawUser = M.quoted?.participant ? M.quoted.participant : M.mentions[0] ? M.mentions[0] : M.sender;
        const resolved = await client.resolveNumber(rawUser);
        const number = resolved || client.getUserNumber(rawUser) || String(rawUser).split('@')[0].replace(/\D/g, '');
        const user = number ? `${number}@s.whatsapp.net` : rawUser;
        const xpKey = number || rawUser;

        const deck = await client.DB.get(`${user}_Deck`) || [];
        const economy = await client.getEcon(rawUser);

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
            bio = 'None';
        }

        const existingLegacy = (await client.exp.get(rawUser)) || 0;
        let experience = (await client.exp.get(xpKey)) || 0;
        if (!experience && existingLegacy) {
            experience = existingLegacy;
            await client.exp.set(xpKey, existingLegacy).catch(() => null);
        }

        const level = getLevelFromXp(experience);
        await client.DB.set(`${user}_LEVEL`, level);
        const stats = getStats(level);

        let globalPosition = 'Unranked';
        try {
            const all = (await client.exp.all()) || [];
            const sorted = all
                .filter((x) => x && x.id)
                .map((x) => ({ id: x.id, value: Number(x.value || 0) }))
                .sort((a, b) => b.value - a.value);
            const myDigits = String(xpKey).replace(/\D/g, '');
            const idx = sorted.findIndex((x) => String(x.id).replace(/\D/g, '') === myDigits);
            if (idx >= 0) globalPosition = `#${idx + 1} of ${sorted.length}`;
        } catch (_) {
            globalPosition = 'Unranked';
        }

        let totalPokeballs = 0;
        try {
            const items = await getInventory(client, xpKey);
            totalPokeballs = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
        } catch (_) {
            totalPokeballs = 0;
        }

        const username = M.pushName;
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
                image: { url: pfp },
                caption: text
            },
            { quoted: M }
        );
    }
};
