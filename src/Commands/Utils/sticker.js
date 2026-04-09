const { Sticker, StickerTypes } = require('wa-sticker-formatter');

module.exports = {
    name: 'sticker',
    aliases: ['s'],
    category: 'utils',
    exp: 1,
    cool: 4,
    react: "🕒",
    usage: 'Use :sticker by quoting an image/gif <pack_name>|<author_name>',
    description: 'Sticker command helps you to convert images or gifs to a sticker',
    async execute(client, arg, M) {
        try {
            const content = JSON.stringify(M.quoted);
            const isMedia = M.type === 'imageMessage' || M.type === 'videoMessage';
            const isQuotedMedia = (M.type === 'extendedTextMessage' && content.includes('imageMessage')) ||
                (M.type === 'extendedTextMessage' && content.includes('videoMessage'));

            if (isMedia || isQuotedMedia) {
                // Split pack and author from the argument
                const [packAuthor, ...flagParts] = arg.split(' ');
                const [packName, authorName] = packAuthor.split('|').map(part => part.trim());
                const flags = flagParts.join(' ');

                // Determine sticker type from flags
                let stickerType = StickerTypes.FULL;
                if (flags.includes('--c') || flags.includes('--crop') || flags.includes('--cropped')) {
                    stickerType = StickerTypes.CROPPED;
                } else if (flags.includes('--s') || flags.includes('--stretch') || flags.includes('--stretched')) {
                    stickerType = StickerTypes.DEFAULT;
                } else if (flags.includes('--circle') || flags.includes('--r') || flags.includes('--round') || flags.includes('--rounded')) {
                    stickerType = StickerTypes.CIRCLE;
                }

                // Download the media
                const buffer = isQuotedMedia ? await M.quoted.download() : await M.download();

                M.reply('✨⚡🔥❤️🥳');

                // Create a new sticker instance
                const sticker = new Sticker(buffer, {
                    pack: packName || '𓆩『 ʜᴀɴᴅᴄʀᴀғᴛᴇᴅ ғᴏʀ ʏᴏᴜ 』𓆪',
                    author: authorName || '𓆩『 🅱🆄🅽🅽🆈 🅱🅾🆃 』𓆪',
                    type: stickerType,
                    categories: ['🤩', '🎉'],
                    quality: 70
                });

                // Build and send the sticker
                await client.sendMessage(
                    M.from,
                    {
                        sticker: await sticker.build()
                    },
                    {
                        quoted: M
                    }
                );
            } else {
                return M.reply('Please quote or caption the image/video.');
            }
        } catch (error) {
            console.error('Error while executing sticker command:', error);
            await M.reply('An error occurred while processing the command.');
        }
    }
};
