const { Sticker, StickerTypes } = require('wa-sticker-formatter');

module.exports = {
    name: 'steal',
    aliases: ['take'],
    category: 'utils',
    exp: 10,
    cool: 4,
    react: "🔥",
    usage: 'Usage :steal attached or quoted to a sticker <pack_name>|<author_name>',
    description: 'Used for stealing stickers',
    async execute(client, arg, M) {
        try {
            const content = JSON.stringify(M.quoted);
            const isQuotedSticker = M.type === 'extendedTextMessage' && content.includes('stickerMessage');

            if (isQuotedSticker) {
                // Split pack and author from the argument
                const [packName, authorName] = arg.split('|').map(part => part.trim());
                
                // Download the quoted sticker
                const buffer = await M.quoted.download();

                // Create a new sticker instance
                const sticker = new Sticker(buffer, {
                    pack: packName || '𓆩『 ʜᴀɴᴅᴄʀᴀғᴛᴇᴅ ғᴏʀ ʏᴏᴜ 』𓆪',
                    author: authorName || '𓆩『 🅱🆄🅽🅽🆈 🅱🅾🆃 』𓆪',
                    type: StickerTypes.FULL,
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
                return M.reply('Please quote the message containing the sticker.');
            }
        } catch (error) {
            console.error('Error while executing steal command:', error);
            await M.reply('An error occurred while processing the command.');
        }
    }
};
