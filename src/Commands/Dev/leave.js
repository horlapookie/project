module.exports = {
    name: 'leave',
    aliases: ['l'],
    category: 'dev',
    exp: 0,
    cool: 4,
    react: "✅",
    description: 'Leave the current group',
    async execute(client, arg, M) {
        try {
            const metadata = await client.groupMetadata(M.from).catch(() => null);
            const mentions = metadata?.participants ? metadata.participants.map((p) => p.id).filter(Boolean) : [];
            await client.sendMessage(M.from, {
                text: 'I am leaving this group now. Thanks for having me here.',
                mentions
            });
            await client.groupLeave(M.from);
        } catch (err) {
            console.error(err);
            await client.sendMessage(M.from, {
                image: { url: `${client.utils.errorChan()}` },
                caption: `${client.utils.greetings()} Error-Chan Dis\n\nError:\n${err}`
            });
        }
    }
};
