const { shizobtn1, shizobtn1img, shizobtn1gif } = require('../../shizofunc.js')
module.exports = {
    name: 'info',
    aliases: ['information'],
    category: 'general',
    exp: 0,
    cool: 4,
    react: "📢",
    usage: 'Use :info',
    description: 'Get bot information',
    async execute(client, arg, M) {

        const getGroups = await client.groupFetchAllParticipating();
        const groups = Object.entries(getGroups).map((entry) => entry[1]);
        const groupCount = groups.length;
        const pad = (s) => (s < 10 ? '0' : '') + s;
        const formatTime = (seconds) => {
            const hours = Math.floor(seconds / (60 * 60));
            const minutes = Math.floor((seconds % (60 * 60)) / 60);
            const secs = Math.floor(seconds % 60);
            return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
        };
        const uptime = formatTime(process.uptime());
        const usersCount = await client.DB.get(`data`) || []
        const usersCounts = usersCount.length
        const modCount = client.mods.length;
        const website = 'coming soon...';
        
        const botName = client.name || process.env.NAME || '𝚅𝙴𝙽 𝚍𝚘𝚖𝚊𝚒𝚗'
        let text = `*┌──────────────❀̥˚─┈ ⳹*\n`;
        text += `*│🏮 BOT INFO:* ${botName}\n`;
        text += `*│🕘 UPTIME:* ${uptime}\n`;
        text += `*│👥 USERS:* ${usersCounts || 0}\n`;
        text += `*│🎟️ COMMANDS:* ${client.cmd.size}\n`;
        text += `*│🌐 GROUPS:* ${groupCount}\n`;
        text += `*│📢 MODS:* ${modCount}\n`;
        text += `*│🔥 SUPPORT:* use ${client.prefix}support\n`;
        text += `*│🎭 WEBSITE:* ${website}\n`;
        text += `*└❀̥˚───────────────┈ ⳹*`;

        return shizobtn1img(client, M.from, text, "https://telegra.ph/file/33b45c9dfd5c35998e704.jpg", "Help", "-help", botName)
       
    }
}; 
