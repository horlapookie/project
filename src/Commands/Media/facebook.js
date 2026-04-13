const axios = require('axios');

module.exports = {
  name: 'facebook',
  aliases: ['fb'],
  category: 'media',
  exp: 5,
  cool: 4,
  react: '✅',
  usage: 'Use :facebook <Link>',
  description: 'Downloads a Facebook video or reel',
  async execute(client, arg, M) {
    if (!arg || !arg.length) {
      return M.reply('❌ Please provide a Facebook URL');
    }

    const url = String(arg).trim();
    if (!url.includes('facebook.com/')) {
      return M.reply('❌ Wrong URL! Only Facebook links are supported.');
    }

    try {
      const { data } = await axios.get(
        `https://api.princetechn.com/api/download/facebook?apikey=prince&url=${encodeURIComponent(url)}`
      );
      const downloadUrl =
        data?.result?.download_url ||
        data?.result?.url ||
        data?.download_url ||
        data?.url ||
        data?.link ||
        data?.data?.url ||
        null;
      if (!downloadUrl) return M.reply('❌ No media found for that Facebook URL.');

      const buffer = await client.utils.getBuffer(downloadUrl);
      await client.sendMessage(M.from, { video: buffer, caption: 'Here is your result' }, { quoted: M });
    } catch (error) {
      return M.reply(`❌ Error while getting video data: ${error.message}`);
    }
  }
};
