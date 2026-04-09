const moment = require('moment-timezone');

function wish() {
    const hour_now = moment.tz('Asia/Kolkata').format('HH');
    let wishWishes = 'Good Morning 🌅';

    if (hour_now >= '06' && hour_now <= '12') {
        wishWishes = 'Good Morning 🌅';
    } else if (hour_now >= '12' && hour_now <= '17') {
        wishWishes = 'Good Afternoon 🏜️';
    } else if (hour_now >= '17' && hour_now <= '19') {
        wishWishes = 'Good Evening 🌆';
    } else if (hour_now >= '19' && hour_now <= '23') {
        wishWishes = 'Good Night 🌃';
    } else if (hour_now >= '23' || hour_now <= '05') {
        wishWishes = 'Sweet Dreams 💖';
    } else if (hour_now >= '05' && hour_now <= '06') {
        wishWishes = 'Go and sleep 😴';
    } else {
        wishWishes = 'Good Night.!!!';
    }
    return wishWishes;
}

module.exports = {
    name: 'help',
    aliases: ['help','list','bot','Bot'],
    category: 'general',
    exp: 50,
    cool: 5,
    react: "💐",
    usage: 'Use -help for helplist or -help <command_name> to get command info',
    description: 'Displays the command list or specific command info',
    async execute(client, arg, M) {
        try {
            const user = (await client.DB.get('data')) || [];
            const m = M.sender;

            // If user is not in data, push the user
            if (!user.includes(m)) {
                await client.DB.push('data', m);
            }

            if (!arg) {
                let pushName = (M.pushName || 'Senpai').trim();
                if (pushName.split(' ').length === 1) {
                    pushName += ' san';
                }

                const pad = (s) => (s < 10 ? '0' : '') + s;
                const formatTime = (seconds) => {
                    const hours = Math.floor(seconds / (60 * 60));
                    const minutes = Math.floor((seconds % (60 * 60)) / 60);
                    const secs = Math.floor(seconds % 60);
                    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
                };

                const uptime = formatTime(process.uptime());
                const usersCount = await client.DB.get('data') || [];
                const usersCounts = usersCount.length;
                const modCount = client.mods.length;
                const categories = client.cmd.reduce((obj, cmd) => {
                    const category = cmd.category || 'Uncategorized';
                    obj[category] = obj[category] || [];
                    obj[category].push(cmd.name);
                    return obj;
                }, {});

                const commandList = Object.keys(categories);
                let commands = '';

                for (const category of commandList) {
                    commands += `*𓊈𒆜 ${client.utils.capitalize(category, true)} 𒆜𓊉* \n\`\`\`${categories[category].join(', ')}\`\`\`\n\n`;
                }

                const message = `*BUNNY GIRL BOT HELP*\n\nHello ${pushName}\n${wish()}\n\n*User:* @${M.sender.split('@')[0]}\n*Uptime:* ${uptime}\n*Users:* ${usersCounts}\n*Mods:* ${modCount}\n\n${commands}`.trim();
                return client.sendMessage(
                    M.from,
                    {
                        image: { url: `${process.cwd()}/assets/Images/battle.png` },
                        caption: message,
                        mentions: [M.sender]
                    },
                    {
                        quoted: M
                    }
                );
            }

            const query = arg.trim().toLowerCase();
            const command =
                client.cmd.get(query) ||
                client.cmd.find((cmd) => cmd.aliases && cmd.aliases.map((alias) => alias.toLowerCase()).includes(query));

            if (!command) {
                return M.reply(`No command named *${arg.trim()}* was found.`);
            }

            const aliases = command.aliases && command.aliases.length ? command.aliases.join(', ') : 'None';
            return M.reply(
                `*Command:* ${command.name}\n*Aliases:* ${aliases}\n*Category:* ${command.category || 'Uncategorized'}\n*Usage:* ${
                    command.usage || 'No usage provided'
                }\n*Description:* ${command.description || 'No description provided'}`
            );
        } catch (error) {
            console.error(error);
            await M.reply('Help command failed to render. Please try again.');
        }
    }
};
