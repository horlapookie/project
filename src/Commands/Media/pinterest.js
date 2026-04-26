const axios = require('axios');

module.exports = {
  name: 'pinterest',
  aliases: ['pin'],
  category: 'media',
  exp: 5,
  cool: 4,
  react: '✅',
  usage: 'Use {prefix}pinterest <Link>',
  description: 'Downloads media from a Pinterest link',
  async execute(client, arg, M) {
    if (!arg || !arg.length) {
      return M.reply('❌ Please provide a Pinterest URL');
    }

    const url = String(arg).trim();
    if (!url.includes('pin.it/') && !url.includes('pinterest.com/')) {
      return M.reply('❌ Wrong URL! Only Pinterest links are supported.');
    }

    try {
      const { data } = await axios.get(
        `https://api.princetechn.com/api/download/pinterestdl?apikey=prince&url=${encodeURIComponent(url)}`
      );
      const downloadUrl =
        data?.result?.download_url ||
        data?.result?.url ||
        data?.download_url ||
        data?.url ||
        data?.link ||
        data?.data?.url ||
        null;
      if (!downloadUrl) return M.reply('❌ No media found for that Pinterest URL.');

      const buffer = await client.utils.getBuffer(downloadUrl);
      await client.sendMessage(M.from, { image: buffer, caption: 'Here is your result' }, { quoted: M });
    } catch (error) {
      return M.reply(`❌ Error while getting Pinterest media: ${error.message}`);
    }
  }
};
