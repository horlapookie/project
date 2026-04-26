const suitableWords = {
    bite: 'Bit', blush: 'Blushed at', bonk: 'Bonked', bully: 'Bullied', cringe: 'Cringed at',
    cry: 'Cried in front of', cuddle: 'Cuddled', dance: 'Danced with', glomp: 'Glomped at', handhold: 'Held the hands of',
    happy: 'is Happied with', highfive: 'High-fived', hug: 'Hugged', kick: 'Kicked', kill: 'Killed', kiss: 'Kissed',
    lick: 'Licked', nom: 'Nomed', pat: 'Patted', poke: 'Poked', slap: 'Slapped', smile: 'Smiled at', smug: 'Smugged',
    wave: 'Waved at', wink: 'Winked at', yeet: 'Yeeted at'
};

const reactions = Object.keys(suitableWords);

module.exports = {
    name: 'reaction',
    description: "React to someone's message with a gif specified by the user.",
    category: 'fun',
    react: "✅",
    aliases: ['r', ...reactions],
    exp: 30,
    cool: 20,
    usage: 'Use {prefix}<reaction>',
    async execute(client, arg, M) {

        const text = arg.trim();
        const command = M.body.split(' ')[0].toLowerCase().slice(client.prefix.length).trim();
        let flag = true;

        if (command === 'r' || command === 'reaction') flag = false;

        if (!flag && !text) {
            const reactionList = `🎃 *Available Reactions:*\n\n- ${reactions
                .map((reaction) => client.utils.capitalize(reaction))
                .join('\n- ')}\n🛠️ *Usage:* ${client.prefix}reaction (reaction) [tag/quote user] | ${
                client.prefix
            }(reaction) [tag/quote user]\nExample: ${client.prefix}pat`;
            return await M.reply(reactionList);
        }

        const reaction = flag ? command : text.split(' ')[0].trim().toLowerCase();

        if (!flag && !reactions.includes(reaction)) {
            return M.reply(`Invalid reaction. Use *${client.prefix}react* to see all of the available reactions`);
        }

        const users = M.mentions;

        if (M.quoted && !users.includes(M.quoted.sender)) {
            users.push(M.quoted.sender);
        }

        if (users.length < 1) {
            users.push(M.sender);
        }

        const reactant = M.mentions[0] || (M.quoted && M.quoted.participant) || M.sender;
        const single = reactant === M.sender;
        const caption = `*@${M.sender.split('@')[0]} ${suitableWords[reaction]} ${
            single ? 'Themselves' : `@${reactant.split('@')[0]}`
        }*`;
        const mentions = [M.sender, reactant].filter(Boolean);

        try {
            const { url } = await client.utils.fetch(`https://api.waifu.pics/sfw/${reaction}`);
            const rawBuffer = await client.utils.getBuffer(url);

            // Try converting to MP4 for proper GIF playback
            let mp4Buffer = null;
            try {
                const converted = await client.utils.gifToMp4(rawBuffer);
                if (client.utils.isLikelyMp4 ? client.utils.isLikelyMp4(converted) : converted?.length > 1000) {
                    mp4Buffer = converted;
                }
            } catch (_) {}

            if (mp4Buffer) {
                return await client.sendMessage(
                    M.from,
                    { video: mp4Buffer, gifPlayback: true, caption, mentions },
                    { quoted: M }
                );
            }

            // Fallback: send as image (first frame) if MP4 failed
            try {
                const png = await client.utils.gifToPng(rawBuffer);
                return await client.sendMessage(
                    M.from,
                    { image: png, caption, mentions },
                    { quoted: M }
                );
            } catch (_) {}

            // Final fallback: send original buffer as image
            return await client.sendMessage(
                M.from,
                { image: rawBuffer, caption, mentions },
                { quoted: M }
            );
        } catch (err) {
            console.error('Reaction command error:', err);
            return M.reply(`${caption}\n\n_(GIF unavailable right now)_`);
        }
    }
};
