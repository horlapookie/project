const Spotify = require('spotifydl-x').default
const { renderSpotifyCard } = require('./CardRenderer')

const credentials = {
    clientId: 'acc6302297e040aeb6e4ac1fbdfd62c3',
    clientSecret: '0e8439a1280a43aba9a5bc0a16f3f009'
}
const spotify = new Spotify(credentials)

const spotifydl = async (url) => {
    const res = await spotify.getTrack(url).catch(() => {
        return { error: 'Failed' }
    })
    if (res.error) {
        throw new Error('Failed to fetch Spotify track details.')
    }

    const card = await renderSpotifyCard({
        cover: res.cover_url,
        title: res.name,
        artists: (res.artists || []).join(', '),
        album: res.album_name || 'Unknown album',
        accent: '#1db954'
    })

    return { data: res, coverimage: card, audio: await spotify.downloadTrack(url) }
    //audio: await spotify.downloadTrack(url)
}

module.exports = {
    spotifydl
}
