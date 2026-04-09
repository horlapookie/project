const { spotifydl } = require('../../lib/Spotify')

module.exports = {
    name: 'spotify',
    aliases: ['sp'],
    category: 'media',
    exp: 5,
    cool: 5,
    react: "✅",
    usage: 'Use :spotify <Link>',
    description: 'Downloads given Spotify track and sends it as audio with an image and caption',
    async execute(client, arg, M) {
        const link = arg
        if (!link.includes('https://open.spotify.com/track/'))
            return M.reply('Please use command with a valid open.spotify.com track link')
        const audioSpotify = await spotifydl(link.trim()).catch((err) => {
            M.reply(err.toString())
            client.log(err, 'red')
            return null
        })

        if (!audioSpotify) return
        if (audioSpotify.error) return M.reply(`Error fetching: ${link.trim()}. Check if the URL is valid and try again.`)

        const caption = `🎧 *Title:* ${audioSpotify.data.name || ''}\n🎤 *Artists:* ${(
            audioSpotify.data.artists || []
        ).join(', ')}\n💽 *Album:* ${audioSpotify.data.album_name}\n📆 *Release Date:* ${
            audioSpotify.data.release_date || ''
        }`

        await client.sendMessage(
            M.from,
            {
                image: audioSpotify.coverimage,
                caption: caption
            },
            {
                quoted: M
            }
        )

        await client.sendMessage(
            M.from,
            {
                audio: audioSpotify.audio,
                mimetype: 'audio/mpeg',
                fileName: audioSpotify.data.name + '.mp3'
            },
            {
                quoted: M
            }
        )
    }
}
