// Use a no-ffmpeg path by default: if user quotes a sticker, we can re-send it without conversion.
// (Animated sticker re-encoding requires ffmpeg in most environments.)

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
                // Download the quoted sticker
                const buffer = await M.quoted.download();
                // Re-send the sticker as-is.
                await client.sendMessage(
                    M.from,
                    {
                        sticker: buffer
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
            await M.reply('Steal failed. If this is an animated sticker, ffmpeg may be required on the server.');
        }
    }
};
