const { getStats, getLevelFromXp } = require('../../Helpers/Stats');
const sortArray = require('sort-array');

module.exports = {
    name: 'leaderboard',
    aliases: ['lb'],
    category: 'general',
    exp: 5,
    cool: 4,
    react: "📢",
    usage: 'Use :lb --credit/--cards',
    description: "Displays global leaderboard of Mai Sakurajima bot in various types",
    async execute(client, arg, M) {
        try {
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

            const lb = sortArray(users, {
                by: 'xp',
                order: 'desc'
            });

            const myKey = client.getUserNumber(M) || M.sender;
            const myPosition = lb.findIndex((x) => x.user === myKey);
            const topUsers = lb.slice(0, 10);

            let text = `☆☆💥 GLOBAL LEADERBOARD 💥☆☆\n\nYour Position: ${myPosition + 1}\n`;

            for (let i = 0; i < topUsers.length; i++) {
                const level = getLevelFromXp(topUsers[i].xp);
                const { requiredXpToLevelUp, rank } = getStats(level);
                const jid = String(topUsers[i].user).includes('@')
                    ? topUsers[i].user
                    : `${topUsers[i].user}@s.whatsapp.net`
                const contactInfo = await client.contact.getContact(jid, client);
                const rawUsername = contactInfo?.username;
                const phoneNum = jid.split('@')[0];
                const username = (rawUsername && rawUsername !== 'User') ? rawUsername : `+${phoneNum}`;
                
                text += `\n\n*(${i + 1})*\n`;
                text += `⛩ Username: ${username}\n`;
                text += `〽️ Level: ${level}\n`;
                text += `🎡 Rank: ${rank}\n`;
                text += `⭐ Exp: ${topUsers[i].xp}\n`;
                text += `🍥 RequiredXpToLevelUp: ${requiredXpToLevelUp} exp required\n`;
            }

            client.sendMessage(
                M.from,
                {
                    image: {
                        url: 'https://i.ibb.co/dJSCxCC/wp6201939-sakurajima-mai-wallpapers.jpg'
                    },
                    caption: text,
                    gifPlayback: true
                },
                {
                    quoted: M
                }
            );
        } catch (error) {
            console.error('Error in leaderboard command:', error);
            M.reply('🟥 *An error occurred while fetching leaderboard.*');
        }
    }
};
