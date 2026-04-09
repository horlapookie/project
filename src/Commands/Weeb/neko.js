const axios = require('axios');

module.exports = {
    name: 'neko',
    aliases: ['catgirl'],
    category: 'weeb',
    exp: 10,
    cool: 4,
    react: "✅",
    usage: 'Use :neko',
    description: 'Sends an image of a random neko',
    async execute(client, arg, M) {
        try {
            const res = await axios.get(`https://api.waifu.pics/sfw/neko`);
            if (!res.data || !res.data.url) {
                throw new Error('Failed to fetch neko image.');
            }
            await client.sendMessage(M.from, {
                image: {
                    url: res.data.url
                },
                caption: 'ɴᴇᴋᴏ ɴᴇɴɪ ꜱᴀɴ\n\nᴍᴀɪ ꜱᴀᴋᴜʀᴀᴊɪᴍᴀ'
            });
        } catch (err) {
            console.error('Error fetching neko image:', err);
            M.reply('Failed to fetch neko image.');
            client.log(err, 'red');
        }
    }
};
