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
    aliases: ['help', 'list'],
    category: 'general',
    exp: 50,
    cool: 5,
    react: "💐",
    usage: 'Use -help for helplist or -help <command_name> to get command info',
    description: 'Displays the command list or specific command info',
    async execute(client, arg, M) {
        try {
            if (arg === '--owner') {
                if (!client.isOwner(M)) return M.reply('This option is only for the bot owner.')

                const ownerCommands = client.cmd.filter(cmd => cmd.category === 'dev' || cmd.hidden)
                const categories = ownerCommands.reduce((obj, cmd) => {
                    const category = cmd.category || 'Uncategorized';
                    obj[category] = obj[category] || [];
                    obj[category].push(cmd.name);
                    return obj;
                }, {});

                let commands = '';
                for (const category of Object.keys(categories)) {
                    commands += `*𓊈𒆜 ${client.utils.capitalize(category, true)} 𒆜𓊉* \n\`\`\`${categories[category].join(', ')}\`\`\`\n\n`;
                }

                const message = [
                    `*OWNER HELP*`,
                    '',
                    `Owner-only and hidden commands:`,
                    '',
                    commands.trim()
                ].join('\n').trim();

                return M.reply(message);
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
                const usersCounts = await client.econ.countDocuments({}).catch(() => 0);
                const modCount = client.mods.length;
                const categories = client.cmd.reduce((obj, cmd) => {
                    if (cmd.hidden) return obj
                    const category = cmd.category || 'Uncategorized';
                    obj[category] = obj[category] || [];
                    obj[category].push(cmd.name);
                    return obj;
                }, {});

                const commandList = Object.keys(categories);
                let commands = '';

                const yugiohCategory = 'yu-gi-oh-cards'
                const yugiohList = [
                    'discard',
                    'giveyucard',
                    'purchase',
                    'sale',
                    'swapyu',
                    't2yucollec',
                    't2yudeck',
                    'yuclaim',
                    'yucollection',
                    'yudeck',
                    'yuget',
                    'yutrade',
                    'yutrade-confirm',
                    'yutrade-delete',
                    'yugioh',
                    'yubattle',
                    'yuaccept',
                    'yudecline',
                    'yubattlestatus',
                    'yusummon',
                    'yuch',
                    'yuhelp'
                ]

                for (const category of commandList) {
                    if (category === yugiohCategory) {
                        commands += `▫▫▫--Yu-gi-oh-cards--▫▫▫\n\`\`\`${yugiohList.join(', ')}\`\`\`\n\n`
                        continue
                    }
                    commands += `*𓊈𒆜 ${client.utils.capitalize(category, true)} 𒆜𓊉* \n\`\`\`${categories[category].join(', ')}\`\`\`\n\n`;
                }

                const brand = client.brand || 'Eternal by VEN domain'
                const botName = client.name || 'Eternal'
                const message = [
                    `*${botName} HELP*`,
                    '',
                    `Hi @${M.sender.split('@')[0]}, I am ${brand}`,
                    `${wish()}`,
                    '',
                    `*Uptime:* ${uptime}`,
                    `*Users:* ${usersCounts}`,
                    `*Mods:* ${modCount}`,
                    '',
                    commands.trim(),
                    '',
                    brand
                ].join('\n').trim();
                return client.sendMessage(
                    M.from,
                    {
                        image: { url: `${process.cwd()}/assets/Images/help.jpeg` },
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
            const usageText = (command.usage || 'No usage provided').replace(/\{prefix\}/g, client.prefix)
            return M.reply(
                `*Command:* ${command.name}\n*Aliases:* ${aliases}\n*Category:* ${command.category || 'Uncategorized'}\n*Usage:* ${usageText}\n*Description:* ${command.description || 'No description provided'}`
            );
        } catch (error) {
            console.error(error);
            await M.reply('Help command failed to render. Please try again.');
        }
    }
};
