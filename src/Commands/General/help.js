const { shizobtn1, shizobtn1img, shizobtn1gif, shizobtn2 } = require('../../shizofunc.js');
const TD = require('better-tord');
const fs = require('fs');
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
            const user = await client.DB.get('data');
            const m = M.sender;

            // If user is not in data, push the user
            if (!user.includes(m)) {
                await client.DB.push('data', m);
            }

            if (!arg) {
                let pushName = M.pushName.trim();
                if (pushName.split(' ').length === 1) {
                    pushName += ' san';
                }

                const getGroups = await client.groupFetchAllParticipating();
                const groups = Object.entries(getGroups).map((entry) => entry[1]);
                const groupCount = groups.length;

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
                const website = 'coming soon...';
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

                let message = `*┌─🄱🄾🅃────────❀̥˚─┈ ⳹*
*└──🄱🅄🄽🄽🅈 🄶🄸🅁🄻──┈ ⳹*
*│▱▱▱▱▱▱▱▱▱▱▱▱▱▱*
*│𓊈 ʜᴇʟʟᴏ ᴛʜᴇʀᴇ ɪ'ᴍ ꜱᴀᴋᴜʀᴀᴊɪᴍᴀ 𓊉*
*│𓆩 ${M.sender.split('@')[0]} 𓆪*
*│ᴡʜᴀᴛ's ᴜᴘ ꜱᴇɴᴘᴀɪ!! 👋🎐*
*│🎯░ ${wish()} ░🎏*
*│░░░░░░░░░░░░░░░░░░░░*
*│📤 ɪɴғᴏ: ʙᴏᴛ ᴠᴇʀꜱɪᴏɴ 𝟐𝟎𝟐𝟒 🎯*
*│░░░░░░░░░░░░░░░░░░░░*
*│🚏 ᴜꜱᴇ ᴛʜᴇ ᴍᴀɴᴜᴀʟ ʙᴜᴛᴛᴏɴ!!🚦*
*│💈ᴄᴀꜱɪɴᴏ ɢᴀᴍᴇ ʙᴏᴛ*
*│- ᴘᴏᴋᴇᴍᴏɴ & ꜱʜᴏᴏʙ ɢᴀᴍᴇ 𖠌*
*│- ᴏᴡɴᴇʀ: ʀᴇᴅᴢᴇᴏꭗ 彡*
*│▱▱▱▱▱▱▱▱▱▱▱▱▱▱*
*┌──🄱🅄🄽🄽🅈 🄶🄸🅁🄻──┈ ⳹*
*└❀̥˚───────────🄱🄾🅃─┈ ⳹*`;
                await shizobtn1img(client, M.from, message, "https://telegra.ph/file/e9b5fa49e5eac946baf4d.jpg", "Manual 🎋🎐", "-shinichi1", "𒉢 ꜱᴀʏ.ꜱᴄ֟፝ᴏᴛᴄʜ ⚡𐇻");
            }
        } catch (error) {
            console.error(error);
        }
    }
};
