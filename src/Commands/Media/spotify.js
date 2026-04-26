const axios = require('axios')

module.exports = {
    name: 'spotify',
    aliases: ['sp'],
    category: 'media',
    exp: 5,
    cool: 5,
    react: "✅",
    usage: 'Use {prefix}spotify <Link>',
    description: 'Downloads given Spotify track and sends it as audio',
    async execute(client, arg, M) {
        const link = String(arg || '').trim()
        if (!link.includes('open.spotify.com/track/'))
            return M.reply('Please use command with a valid open.spotify.com track link')

        try {
            const apiUrl = `https://api.princetechn.com/api/download/spotifydl?apikey=prince&url=${encodeURIComponent(link)}`
            const { data } = await axios.get(apiUrl)
            const downloadUrl =
                data?.result?.download_url ||
                data?.result?.url ||
                data?.download_url ||
                data?.url ||
                data?.link ||
                data?.data?.url ||
                null
            if (!downloadUrl) return M.reply('Unable to fetch this Spotify track.')

            const audioBuffer = await client.utils.getBuffer(downloadUrl)
            await client.sendMessage(
                M.from,
                {
                    audio: audioBuffer,
                    mimetype: 'audio/mpeg',
                    fileName: 'spotify.mp3'
                },
                {
                    quoted: M
                }
            )
        } catch (err) {
            console.error(err)
            return M.reply('An error occurred while downloading the Spotify audio.')
        }
    }
}
