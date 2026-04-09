const { Anime } = require('@shineiichijo/marika');

module.exports = {
    name: 'anime',
    aliases: ['ani'],
    category: 'weeb',
    exp: 5,
    cool: 4,
    react: "✅",
    usage: 'Use :anime <anime_name>',
    description: 'Gives you the info of the anime that you provided',
    async execute(client, arg, M) {
        try {
            if (!arg) return M.reply('Provide a query for the search, Baka!');
            const query = arg.trim();
            const { data } = await new Anime().searchAnime(query);
            const result = data[0];
            
            if (!result) {
                return M.reply('No anime found with that query.');
            }
            
            let text = '';
            text += `🎀 *Title:* ${result.title}\n`;
            text += `🎋 *Format:* ${result.type}\n`;
            text += `📈 *Status:* ${client.utils.capitalize(result.status.replace(/\_/g, ' '))}\n`;
            text += `🍥 *Total episodes:* ${result.episodes}\n`;
            text += `🎈 *Duration:* ${result.duration}\n`;
            text += `🧧 *Genres:* ${result.genres.map((genre) => genre.name).join(', ')}\n`;
            text += `✨ *Based on:* ${client.utils.capitalize(result.source)}\n`;
            text += `📍 *Studios:* ${result.studios.map((studio) => studio.name).join(', ')}\n`;
            text += `🎴 *Producers:* ${result.producers.map((producer) => producer.name).join(', ')}\n`;
            text += `💫 *Premiered on:* ${result.aired.from}\n`;
            text += `🎗 *Ended on:* ${result.aired.to}\n`;
            text += `🎐 *Popularity:* ${result.popularity}\n`;
            text += `🎏 *Favorites:* ${result.favorites}\n`;
            text += `🎇 *Rating:* ${result.rating}\n`;
            text += `🏅 *Rank:* ${result.rank}\n\n`;
            if (result.background !== null) text += `🎆 *Background:* ${result.background}*\n\n`;
            text += `❄ *Description:* ${result.synopsis}`;
            
            const image = result.images.jpg.large_image_url; // Use URL directly
            
            await client.sendMessage(M.from, {
                image: {
                    url: image,
                },
                caption: text,
            });
        } catch (err) {
            console.error('Error fetching anime information:', err);
            M.reply('An error occurred while fetching anime information.');
        }
    }
};
