const { getStats, getLevelFromXp } = require('../../Helpers/Stats');
const sortArray = require('sort-array');

module.exports = {
    name: 'leaderboard',
    aliases: ['lb'],
    category: 'general',
    exp: 5,
    cool: 4,
    react: "📢",
    usage: 'Use {prefix}lb or :lb --gems',
    description: "Displays global leaderboard by XP or Golds",
    async execute(client, arg, M) {
        try {
            const mode = String(arg || '').trim().toLowerCase();
            const isGems =
                mode === '--gems' || mode === 'gems' || mode === '-gems' ||
                mode === '--golds' || mode === 'golds' || mode === '-golds' ||
                mode === '--gold' || mode === 'gold' || mode === '-gold';

            if (isGems) {
                // --- GOLDS LEADERBOARD (wallet + treasury) ---
                const allEcon = await client.econ.find({}).catch(() => []);
                if (!allEcon || !allEcon.length) {
                    return M.reply('🟥 *There are no users with golds yet.*');
                }

                const users = allEcon
                    .filter((e) => e && e.userId)
                    .map((e) => ({
                        user: e.userId,
                        gems: Math.round(Number(e.gem || 0) + Number(e.treasury || 0))
                    }))
                    .filter((u) => u.gems > 0);

                const lb = sortArray(users, { by: 'gems', order: 'desc' });

                const myKey = client.getUserNumber(M) || M.sender;
                const myPosition = lb.findIndex((x) => {
                    const xNum = String(x.user || '').replace(/\D/g, '');
                    const mNum = String(myKey || '').replace(/\D/g, '');
                    return xNum && mNum && xNum === mNum;
                });

                const topUsers = lb.slice(0, 10);
                const mentions = [];

                let text = `🪙 *GOLDS LEADERBOARD* 🪙\n\nYour Position: ${myPosition >= 0 ? myPosition + 1 : 'Unranked'}\n`;

                for (let i = 0; i < topUsers.length; i++) {
                    const rawUser = String(topUsers[i].user || '');
                    const jid = rawUser.includes('@') ? rawUser : `${rawUser.replace(/\D/g, '')}@s.whatsapp.net`;
                    mentions.push(jid);

                    text += `\n\n*(${i + 1})*\n`;
                    text += `⛩ User: @${jid.split('@')[0]}\n`;
                    text += `🪙 Golds: ${topUsers[i].gems.toLocaleString()}\n`;
                }

                return client.sendMessage(
                    M.from,
                    {
                        image: { url: 'https://i.ibb.co/dJSCxCC/wp6201939-sakurajima-mai-wallpapers.jpg' },
                        caption: text,
                        mentions,
                        gifPlayback: true
                    },
                    { quoted: M }
                );
            }

            // --- XP LEADERBOARD (default) ---
            const exp = await client.exp.all();

            if (!exp || exp.length === 0) {
                return M.reply('🟥 *There are no users with XP*');
            }

            const users = exp
                .filter((x) => x && x.id)
                .map((x) => ({
                    user: x.id,
                    xp: Number(x.value || 0)
                }));

            const lb = sortArray(users, { by: 'xp', order: 'desc' });

            const myKey = client.getUserNumber(M) || M.sender;
            const myPosition = lb.findIndex((x) => {
                const xNum = String(x.user || '').replace(/\D/g, '');
                const mNum = String(myKey || '').replace(/\D/g, '');
                return xNum && mNum && xNum === mNum;
            });

            const topUsers = lb.slice(0, 10);
            const mentions = [];

            let text = `☆☆💥 GLOBAL LEADERBOARD 💥☆☆\n\nYour Position: ${myPosition >= 0 ? myPosition + 1 : 'Unranked'}\n`;

            for (let i = 0; i < topUsers.length; i++) {
                const rawUser = String(topUsers[i].user || '');
                const jid = rawUser.includes('@') ? rawUser : `${rawUser.replace(/\D/g, '')}@s.whatsapp.net`;
                const level = getLevelFromXp(topUsers[i].xp);
                const { requiredXpToLevelUp, rank } = getStats(level);
                mentions.push(jid);

                text += `\n\n*(${i + 1})*\n`;
                text += `⛩ User: @${jid.split('@')[0]}\n`;
                text += `〽️ Level: ${level}\n`;
                text += `🎡 Rank: ${rank}\n`;
                text += `⭐ Exp: ${topUsers[i].xp}\n`;
                text += `🍥 XP to Next Level: ${requiredXpToLevelUp} required\n`;
            }

            client.sendMessage(
                M.from,
                {
                    image: { url: 'https://i.ibb.co/dJSCxCC/wp6201939-sakurajima-mai-wallpapers.jpg' },
                    caption: text,
                    mentions,
                    gifPlayback: true
                },
                { quoted: M }
            );
        } catch (error) {
            console.error('Error in leaderboard command:', error);
            M.reply('🟥 *An error occurred while fetching leaderboard.*');
        }
    }
};
