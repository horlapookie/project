import yts from 'yt-search'
import { Message, Command, BaseCommand } from '../../Structures'
import { IArgs } from '../../Types'

@Command('yts', {
    description: 'Searches the video of the given query in YouTube',
    category: 'media',
    cooldown: 10,
    exp: 10,
    usage: 'yts [query]',
    aliases: ['ytsearch']
})
export default class extends BaseCommand {
    public override execute = async (M: Message, { context }: IArgs): Promise<void> => {
        if (!context) return void M.reply('Provide a query, Baka!')
        const query = context.trim()
        const { videos } = await yts(query)
        if (!videos || !videos.length) return void M.reply(`No videos found | *"${query}"*`)
        let text = ''
        const length = videos.length >= 10 ? 10 : videos.length
        for (let i = 0; i < length; i++)
            text += `*#${i + 1}*\n📗 *Title: ${videos[i].title}*\n📕 *Channel: ${videos[i].author.name
                }*\n📙 *Duration: ${videos[i].seconds}s*\n🔗 *URL: ${videos[i].url}*\n\n`
        const thumbnail = videos[0].thumbnail ? await this.client.utils.getBuffer(videos[0].thumbnail) : undefined
        return void (await M.reply(text, 'text', undefined, undefined, undefined, undefined, {
            title: videos[0].title,
            thumbnail: thumbnail,
            mediaType: 2,
            body: videos[0].description,
            mediaUrl: videos[0].url
        }))
    }
}
