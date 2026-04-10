const { shizobtn1, shizobtn1img, shizobtn1gif } = require('../../shizofunc.js')
module.exports = {
    name: 'Repo',
    aliases: ['repo','script'],
    category: 'general',
    exp: 0,
    cool: 4,
    react: "👿",
    usage: 'Use :- Hahaha Leave it!!! ',
    description: 'Fool Kid You think 💬 This bot is a public one ⁉',
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
        const website = 'Coming soon...';
        
        const botName = client.name || '𝚅𝙴𝙽 𝚍𝚘𝚖𝚊𝚒𝚗'
        let text = `*${botName}*\n\n*Support Groups:*\n1. https://chat.whatsapp.com/Lw7G2TE1rtyJo6fG3skbNl?mode=gi_t\n2. https://chat.whatsapp.com/IBpLw9pGu5X0fiIxY2zHJI?mode=gi_t\n3. https://chat.whatsapp.com/IPHkNCUD12TE4mppKZlJB0`

        return shizobtn1img(client, M.from, text, "https://telegra.ph/file/fe7d26d07ca4a88657159.jpg", "Help", "-help", botName)
       
    }
}; 
