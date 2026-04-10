const { getStats, getLevelFromXp } = require('../../Helpers/Stats');
const { renderRankCard } = require('../../lib/CardRenderer')

module.exports = {
    name: 'rank',
    aliases: ['rk'],
    category: 'general',
    exp: 100,
    cool: 4,
    react: "⚡",
    usage: 'Use :rank',
    description: 'Gives you your rank card',
    async execute(client, arg, M) {
        const user = M.quoted?.participant ? M.quoted.participant : M.mentions[0] ? M.mentions[0] : M.sender;

        let pfp;
        try {
            pfp = await client.profilePictureUrl(user, 'image');
        } catch {
            pfp = 'https://i.ibb.co/Ycg1s7q/Picsart-24-05-18-15-10-43-623.jpg';
        }

        const experience = (await client.exp.get(user)) || 0;
        const level = getLevelFromXp(experience);
        const { requiredXpToLevelUp, rank } = getStats(level);
        await client.DB.set(`${user}_LEVEL`, level);
        const username = (await client.contact.getContact(user, client)).username;

        const card = await renderRankCard({
            avatar: pfp,
            username,
            level,
            currentXP: experience,
            requiredXP: requiredXpToLevelUp,
            rank,
            discriminator: `@${user.split('@')[0]}`
        })

        client.sendMessage(
            M.from,
            {
                image: card,
                caption: `*┏─━══─| ʀᴀɴᴋ ᴄᴀʀᴅ |─══━─∘⦿ꕹ᛫*\n*╏ᴜꜱᴇʀ:* @${user.split("@")[0]}\n*╏🎯 ᴇꭗᴘ:* ${experience}/${requiredXpToLevelUp}\n*╏❤️ ʟᴇᴠᴇʟ:* ${level}\n*╏🔮 ʀᴀɴᴋ:* ${rank}\n*┗─══─━══─| ✾ |─══━─══─∘⦿ꕹ᛫*`,
                mentions: [user]
            },
            {
                quoted: M
            }
        );
    }
};
