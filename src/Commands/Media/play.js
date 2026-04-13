const axios = require('axios');
const yts = require('yt-search');

module.exports = {
    name: 'play',
    aliases: ['ply','Play'],
    category: 'media',
    exp: 5,
    cool: 4,
    react: "🎧",
    usage: 'Use :ytaudio <song_link>',
    description: 'Downloads given YouTube video and sends it as audio',
    async execute(client, arg, M) {
        try {
            const resolveLink = async (term) => {
                const { videos } = await yts(term.trim());
                if (!videos || !videos.length) return null;
                return videos[0].url;
            };

            if (!arg) return M.reply('Please use this command with a valid YouTube link');

            const validPathDomains = /^https?:\/\/(youtu\.be\/|(www\.)?youtube\.com\/(embed|v|shorts)\/)/;
            const term = validPathDomains.test(arg) ? arg.trim() : await resolveLink(arg);
            if (!term) return M.reply('Please use this command with a valid YouTube content link.');

            const apiUrl = `https://api.princetechn.com/api/download/yta?apikey=prince&url=${encodeURIComponent(term.trim())}`;

            M.reply('Downloading has started, please wait...');
            const { data } = await axios.get(apiUrl);
            const downloadUrl =
                data?.result?.download_url ||
                data?.result?.url ||
                data?.download_url ||
                data?.url ||
                data?.link ||
                data?.data?.url ||
                null;
            if (!downloadUrl) return M.reply('Unable to fetch audio for that link.');

            const audioBuffer = await client.utils.getBuffer(downloadUrl);
            await client.sendMessage(
                M.from,
                {
                    audio: audioBuffer,
                    mimetype: 'audio/mpeg',
                    fileName: `audio.mp3`
                },
                {
                    quoted: M
                }
            );
        } catch (error) {
            console.error(error);
            M.reply('An error occurred while downloading the YouTube video audio.');
        }
    }
};
