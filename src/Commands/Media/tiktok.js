const axios = require('axios');

module.exports = {
  name: 'tiktok',
  aliases: ['tt'],
  category: 'media',
  exp: 5,
  cool: 4,
  react: '✅',
  usage: 'Use :tiktok <Link>',
  description: 'Downloads a TikTok video',
  async execute(client, arg, M) {
    if (!arg || !arg.length) {
      return M.reply('❌ Please provide a TikTok URL');
    }

    const url = String(arg).trim();
    if (!url.includes('tiktok.com/')) {
      return M.reply('❌ Wrong URL! Only TikTok links are supported.');
    }

    try {
      const { data } = await axios.get(
        `https://api.princetechn.com/api/download/tiktok?apikey=prince&url=${encodeURIComponent(url)}`
      );
      const downloadUrl =
        data?.result?.download_url ||
        data?.result?.url ||
        data?.download_url ||
        data?.url ||
        data?.link ||
        data?.data?.url ||
        null;
      if (!downloadUrl) return M.reply('❌ No media found for that TikTok URL.');

      const buffer = await client.utils.getBuffer(downloadUrl);
      await client.sendMessage(M.from, { video: buffer, caption: 'Here is your result' }, { quoted: M });
    } catch (error) {
      return M.reply(`❌ Error while getting TikTok video: ${error.message}`);
    }
  }
};
