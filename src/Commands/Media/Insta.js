const axios = require('axios');

module.exports = {
  name: 'insta',
  aliases: ['instagram'],
  category: 'media',
  exp: 5,
  cool: 4,
  react: "✅",
  usage: 'Use :insta <Link>',
  description: 'Sends the content of a given Instagram URL',
  async execute(client, arg, M) { 
    if (!arg || !arg.length) {
      return M.reply('❌ Please provide an Instagram URL');
    }

    const url = arg;
    if (
      !(
        url.includes('instagram.com/p/') ||
        url.includes('instagram.com/reel/') ||
        url.includes('instagram.com/tv/')
      )
    ) {
      return M.reply('❌ Wrong URL! Only Instagram posts, reels, and TV content can be accessed');
    }

    try {
      const { data } = await axios.get(
        `https://api.princetechn.com/api/download/instadl?apikey=prince&url=${encodeURIComponent(url)}`
      );
      const downloadUrl =
        data?.result?.download_url ||
        data?.result?.url ||
        data?.download_url ||
        data?.url ||
        data?.link ||
        data?.data?.url ||
        null;
      if (!downloadUrl) return M.reply('❌ No media found for that Instagram URL.');

      const buffer = await client.utils.getBuffer(downloadUrl);
      await client.sendMessage(M.from, {
        video: buffer,
        caption: 'Here is your result'
      });
    } catch (error) {
      return M.reply(`❌ Error while getting video/image data: ${error.message}`);
    }
  }
};
