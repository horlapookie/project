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
        
       let text = `*┌──────────────❀̥˚─┈ ⳹*\n`;
        text += `*│ɪ ᴛ ᴧ ᴄ ʜ ɪ 🧧*\n`;
        text += `*│🏮 ʀᴇᴘᴏ ꜱɪᴢᴇ:-* *• 305MB*\n`;
        text += `*│👥 ᴜꜱᴇʀ:-* ${usersCounts || 0}\n`;
        text += `*│🗃️ ʟᴀꜱᴛ ᴜᴘᴅᴀᴛᴇᴅ:-* *June 29TH*\n`;
        text += `*│💽 ᴛʜᴀɴᴋ ʏᴏᴜ ᴀʟʟ ғᴏʀ ᴜꜱɪɴɢ*\n`;
        text += `*│ᴍʏ ʙᴏᴛ ᴀɴᴅ ꜱᴜᴘᴘᴏʀᴛɪɴɢ ᴍᴇ...*\n`;
        text += `*│❤️ ɪɴꜱᴛᴀ:-* *@ꜱᴀʏ.ꜱᴄᴏᴛᴄʜ*\n`;
        text += `*└❀̥˚───────────────┈ ⳹*`;

        return shizobtn1img(client, M.from, text, "https://telegra.ph/file/fe7d26d07ca4a88657159.jpg", "Creator 💟", "-owner", "𒉢 ꜱᴀʏ.ꜱᴄ֟፝ᴏᴛᴄʜ ⚡𐇻")
       
    }
}; 
