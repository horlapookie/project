const { NEWS } = require('@consumet/extensions');

module.exports = {
    name: 'aninews',
    aliases: ['animenews'],
    category: 'weeb',
    exp: 15,
    cool: 4,
    react: "✅",
    usage: 'Use :aninews',
    description: 'Provides news about anime world by aurora',
    async execute(client, arg, M) {
        try {
            const news = await new NEWS.ANN().fetchNewsFeeds();
            for (let i = 0; i < 5 && i < news.length; i++) {
                const article = news[i];
                const topics = article.topics.join('\n');
                const previewIntro = article.preview.intro.replace(/\n/g, '\n\n');
                const previewFull = article.preview.full.replace(/\n/g, '\n\n');
                const footerText = "© _Team Aurora𝄞"; // Add your footer text here
                await client.sendMessage(M.from, {
                    image: {
                        url: article.thumbnail
                    },
                    caption: `*❯─『 ANIME NEWS 』─❮*\n*Title*: ${article.title}\n*ID*: ${article.id}\n*Topics*: ${topics}\n*Uploaded At*: ${article.uploadedAt}\n*Preview*:-\n\n*Intro*: ${previewIntro}\n\n*Description*: ${previewFull}\n*Link*: ${article.url}`
                });
            }
        } catch (err) {
            M.reply(err.toString());
            client.log(err, 'red');
        }
    }
};
