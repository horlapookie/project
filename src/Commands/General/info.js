const { shizobtn1, shizobtn1img, shizobtn1gif } = require('../../shizofunc.js')
module.exports = {
    name: 'info',
    aliases: ['information'],
    category: 'general',
    exp: 0,
    cool: 4,
    react: "📢",
    usage: 'Use {prefix}info or :info <command>',
    description: 'Get bot information or command info',
    async execute(client, arg, M) {
        // If a command is provided, show command help (same idea as `help <cmd>`).
        const query = String(arg || '').trim().toLowerCase()
        if (query) {
            const cmd =
                client.cmd.get(query) ||
                client.cmd.find((c) => c.aliases && c.aliases.map((a) => a.toLowerCase()).includes(query))
            if (!cmd) return M.reply(`No command named *${arg.trim()}* was found.`)
            const aliases = cmd.aliases && cmd.aliases.length ? cmd.aliases.join(', ') : 'None'
            const usageText = (cmd.usage || 'No usage provided').replace(/\{prefix\}/g, client.prefix)
            return M.reply(
                `*Command:* ${cmd.name}\n*Aliases:* ${aliases}\n*Category:* ${cmd.category || 'Uncategorized'}\n*Usage:* ${usageText}\n*Description:* ${cmd.description || 'No description provided'}`
            )
        }

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
        
        const botName = client.name || process.env.NAME || 'Eternal'
        const brand = client.brand || `${botName} ᵇʸ ᵛᵉⁿ ᵈᵒᵐᵃⁱⁿ`
        let text = `*┌──────────────❀̥˚─┈ ⳹*\n`;
        text += `*│🏮 BOT INFO:* ${brand}\n`;
        text += `*│🕘 UPTIME:* ${uptime}\n`;
        text += `*│👥 USERS:* ${usersCounts || 0}\n`;
        text += `*│🎟️ COMMANDS:* ${client.cmd.size}\n`;
        text += `*│🌐 GROUPS:* ${groupCount}\n`;
        text += `*│📢 MODS:* ${modCount}\n`;
        text += `*│🔥 SUPPORT:* use ${client.prefix}support\n`;
        text += `*│🎭 WEBSITE:* ${website}\n`;
        text += `*└❀̥˚───────────────┈ ⳹*`;

        return shizobtn1img(client, M.from, text, `${process.cwd()}/assets/Images/help.jpeg`, "Help", "-help", botName)
       
    }
}; 
