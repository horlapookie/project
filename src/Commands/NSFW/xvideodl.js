const axios = require('axios');

module.exports = {
  name: 'xvideodl',
  aliases: ['xvideosdl'],
  category: 'nsfw',
  exp: 5,
  cool: 4,
  react: '✅',
  usage: 'Use :xvideodl <Link>',
  description: 'Downloads a video from Xvideos',
  async execute(client, arg, M) {
    if (!arg || !arg.length) {
      return M.reply('❌ Please provide an Xvideos URL');
    }

    const url = String(arg).trim();
    if (!url.includes('xvideos.com/')) {
      return M.reply('❌ Wrong URL! Only Xvideos links are supported.');
    }

    try {
      const { data } = await axios.get(
        `https://api.princetechn.com/api/download/xvideosdl?apikey=prince&url=${encodeURIComponent(url)}`
      );
      const downloadUrl =
        data?.result?.files?.high ||
        data?.result?.files?.low ||
        data?.result?.download_url ||
        data?.result?.url ||
        data?.download_url ||
        data?.url ||
        data?.link ||
        data?.data?.url ||
        null;
      if (!downloadUrl) return M.reply('❌ No media found for that Xvideos URL.');

      const buffer = await client.utils.getBuffer(downloadUrl);
      await client.sendMessage(M.from, { video: buffer, caption: 'Here is your result' }, { quoted: M });
    } catch (error) {
      return M.reply(`❌ Error while downloading: ${error.message}`);
    }
  }
};
