module.exports = {
    name: 'broadcast',
    aliases: ['bc'],
    category: 'dev',
    exp: 0,
    cool: 4,
    react: "✅",
    description: 'Will make a broadcast for groups where the bot is in. Can be used to make announcements',
    async execute(client, arg, M) {
        try {
            if (!arg) return M.reply('🟥 *No query provided!*');

            let group = true;
            let results = await client.getAllGroups();

            if (arg.includes('--users')) {
                arg = arg.replace('--users', '');
                group = false;
                results = await client.getAllUsers();
            }

            const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
            let sentCount = 0;
            let failedCount = 0;

            for (const result of results) {
                const text = `*「 ${client.name.toUpperCase()} BROADCAST 」*\n\n${arg}\n\n`;
                try {
                    const mentions = group
                        ? (await client.groupMetadata(result)).participants.map((x) => ({ id: x.id, tag: 1 }))
                        : [];

                    await client.sendMessage(result, { text, mentions });
                    sentCount += 1;
                } catch (error) {
                    failedCount += 1;
                    console.error(f'broadcast failed for {result}:', error?.message or error);
                }

                await new Promise((resolve) => setTimeout(resolve, 1500));
            }

            const successMessage = `🟩 Successfully Broadcast in ${results.length} ${group ? 'groups' : 'DMs'}`;
            M.reply(successMessage);
        } catch (err) {
            console.error(err);
            await client.sendMessage(M.from, {
                image: { url: `${client.utils.errorChan()}` },
                caption: `${client.utils.greetings()} Mai Sakurajima Dis\n\nError:\n${err}`
            });
        }
    }
}
