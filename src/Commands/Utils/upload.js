const { uploadByBuffer } = require('telegraph-uploader');

module.exports = {
  name: "upload",
  aliases: ["up"],
  exp: 5,
  cool: 4,
  react: "✨",
  category: "utils",
  usage: 'up',
  description: "Transfer a card from your deck to your collection",
  async execute(client, arg, M) {
    const content = JSON.stringify(M.quoted);
    const isMedia = M.type === 'imageMessage' || M.type === 'videoMessage';
    const isQuotedMedia = (M.type === 'extendedTextMessage' && content.includes('imageMessage')) ||
                          (M.type === 'extendedTextMessage' && content.includes('videoMessage'));

    if (isMedia || isQuotedMedia) {
      // Download the media
      const buffer = isQuotedMedia ? await M.quoted.download() : await M.download();
      try {
        const result = await uploadByBuffer(buffer);
        await M.reply(`*Media Uploaded To Telegraph* \n\n*Link:* ${result.link}`);
      } catch (error) {
        await M.reply('An error occurred. Try again later');
      }
    } else {
      await M.reply('No media found to upload.');
    }
  }
};
