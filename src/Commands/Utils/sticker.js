const sharp = require('sharp');

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
                const buffer = isQuotedMedia ? await M.quoted.download() : await M.download();
                // Simple image-to-sticker without ffmpeg.
                // (Animated video/gif stickers require ffmpeg, which may not exist on your server.)
                if (content.includes('videoMessage') || M.type === 'videoMessage') {
                    return M.reply('Video/GIF stickers require ffmpeg on the server. Send an image to make a sticker.')
                }

                const webp = await sharp(buffer)
                    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .webp()
                    .toBuffer();

                await client.sendMessage(
                    M.from,
                    {
                        sticker: webp
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
            await M.reply('Sticker failed. If you tried a GIF/video, ffmpeg may be required on the server.');
        }
    }
};
