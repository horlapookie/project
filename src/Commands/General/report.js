module.exports = {
    name: 'report',
    aliases: ['report'],
    category: 'general',
    exp: 5,
    cool: 4,
    react: "✅",
    usage: 'Use :report <Your_report>',
    description: 'Reports user issues',
    async execute(client, arg, M) {
    
        let user = M.sender;
        let group = M.from;
        let tr = arg;
        let code = client.groupInviteCode(M.from);
        let report = `*『 Report Received! 』*\n\nGroup = ${group}\n\nSender = ${user}\n\nMessage: ${tr}\n\nCode = ${code}`;
        let text = `Your report has been successfully sent to the Mods group. Hope the mods will reply soon.`;

        // Send the report message to the Mods group
        await client.sendMessage("120363236615391329@g.us", { text: report }, { quoted: M });
        
        // Send a confirmation message to the user
        await client.sendMessage(M.from, { text: text }, { quoted: M });
    }
};
