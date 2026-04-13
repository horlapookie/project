const axios = require('axios');

module.exports = {
  name: 'xvideo-search',
  aliases: ['xvideos-search', 'xsearch'],
  category: 'nsfw',
  exp: 5,
  cool: 4,
  react: '✅',
  usage: 'Use :xvideo-search <query>',
  description: 'Search Xvideos and return top 10 links',
  async execute(client, arg, M) {
    const query = String(arg || '').trim();
    if (!query) return M.reply('❌ Please provide a search query.');

    try {
      const { data } = await axios.get(
        `https://api.princetechn.com/api/search/xvideos?apikey=prince&query=${encodeURIComponent(query)}`
      );
      const results =
        data?.result ||
        data?.data ||
        data?.results ||
        data?.videos ||
        [];
      if (!Array.isArray(results) || results.length === 0) {
        return M.reply('❌ No results found.');
      }

      const top = results.slice(0, 10);
      const lines = top.map((item, idx) => {
        const title = item?.title || item?.name || 'Untitled';
        const link = item?.url || item?.link || item?.video_url || '';
        return `*${idx + 1}.* ${title}\n${link}`;
      });
      return M.reply(lines.join('\n\n'));
    } catch (error) {
      return M.reply(`❌ Error while searching: ${error.message}`);
    }
  }
};
