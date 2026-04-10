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
        const tr = String(arg || '').trim();
        if (!tr) return M.reply(`Use ${client.prefix}report <message>`)

        const reporterNumber = client.getUserNumber(M) || '';
        const reporterJid = reporterNumber ? `${reporterNumber}@s.whatsapp.net` : M.sender;
        const reporterName = (await client.contact.getContact(reporterJid, client).catch(() => null))?.username || M.pushName || 'Unknown';
        const group = M.from;
        let code = '';
        try {
            code = await client.groupInviteCode(M.from);
        } catch (_) {
            code = 'N/A';
        }

        const senderLine = reporterNumber ? `wa.me/${reporterNumber}` : reporterJid;
        const report = `*『 Report Received! 』*\n\nGroup = ${group}\nReporter = ${reporterName}\nSender = ${senderLine}\nMessage: ${tr}\nInviteCode = ${code}`;
        const text = `Your report has been sent to the moderators.`;

        const modNumbers = (client.mods || []).slice(0, 10);
        const targets = modNumbers.map((n) => `${n}@s.whatsapp.net`);
        for (const jid of targets) {
            try {
                await client.sendMessage(jid, { text: report }, { quoted: M });
            } catch (_) {
                // ignore per-mod send failures
            }
        }

        await client.sendMessage(M.from, { text }, { quoted: M });
    }
};
