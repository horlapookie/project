const axios = require('axios');

module.exports = {
  name: 'tiktok',
  aliases: ['tt'],
  category: 'media',
  exp: 5,
  cool: 4,
  react: '✅',
  usage: 'Use {prefix}tiktok <Link>',
  description: 'Downloads a TikTok video',
  async execute(client, arg, M) {
    if (!arg || !arg.length) {
      return M.reply('❌ Please provide a TikTok URL');
    }

    const url = String(arg).trim();
    if (!url.includes('tiktok.com/')) {
      return M.reply('❌ Wrong URL! Only TikTok links are supported.');
    }

    const apis = [
      async () => {
        const { data } = await axios.post(
          'https://www.tikwm.com/api/',
          new URLSearchParams({ url, hd: '1' }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 }
        );
        const r = data?.data;
        return r?.hdplay || r?.play || r?.wmplay || null;
      },
      async () => {
        const { data } = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`, { timeout: 20000 });
        const r = data?.data;
        return r?.hdplay || r?.play || r?.wmplay || null;
      },
      async () => {
        const { data } = await axios.get(
          `https://api.princetechn.com/api/download/tiktok?apikey=prince&url=${encodeURIComponent(url)}`,
          { timeout: 20000 }
        );
        return (
          data?.result?.download_url ||
          data?.result?.url ||
          data?.download_url ||
          data?.url ||
          data?.link ||
          data?.data?.url ||
          null
        );
      }
    ];

    let downloadUrl = null;
    let lastErr = null;
    for (const fn of apis) {
      try {
        downloadUrl = await fn();
        if (downloadUrl) break;
      } catch (e) {
        lastErr = e;
      }
    }

    if (!downloadUrl) {
      return M.reply(`❌ No media found for that TikTok URL.${lastErr ? ` (${lastErr.message})` : ''}`);
    }

    try {
      const buffer = await client.utils.getBuffer(downloadUrl);
      await client.sendMessage(M.from, { video: buffer, caption: 'Here is your result' }, { quoted: M });
    } catch (error) {
      return M.reply(`❌ Error while sending TikTok video: ${error.message}`);
    }
  }
};
