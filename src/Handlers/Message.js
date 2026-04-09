const { getBinaryNodeChild } = require('@whiskeysockets/baileys');
const { serialize } = require('../Structures/WAclient');
const { getStats } = require('../Helpers/Stats');
const chalk = require('chalk');
const axios = require('axios');
const cron = require("node-cron");
const { Collection } = require('discord.js');
const { join } = require('path');
const cool = new Collection();

module.exports = MessageHandler = async (messages, client) => {
    try {
        if (messages.type !== 'notify') return;

        let M = serialize(JSON.parse(JSON.stringify(messages.messages[0])), client);
        if (!M.message) return;
        if (M.key && M.key.remoteJid === 'status@broadcast') return;
        if (['protocolMessage', 'senderKeyDistributionMessage', '', null].includes(M.type)) return;

        const { isGroup, sender, from, body } = M;
        const gcMeta = isGroup ? await client.groupMetadata(from) : null;
        const gcName = isGroup ? gcMeta.subject : '';
        const args = body.trim().split(/\s+/).slice(1);
        const isCmd = body.startsWith(client.prefix);
        const cmdName = body.slice(client.prefix.length).trim().split(/\s+/).shift().toLowerCase();
        const arg = body.replace(cmdName, '').slice(client.prefix.length).trim();
        const groupMembers = gcMeta?.participants || [];
        const groupAdmins = groupMembers.filter(member => member.admin).map(member => member.id);
        const ActivateMod = (await client.DB.get('mod')) || [];
        const ActivateChatBot = (await client.DB.get('chatbot')) || [];
        const banned = (await client.DB.get('banned')) || [];
        const companion = await client.poke.get(`${sender}_Companion`);
        const economy = await client.econ.findOne({ userId: sender });
        const senderIsMod = client.isMod(M);

        // Antilink system
        if (isGroup && ActivateMod.includes(from) && groupAdmins.includes(client.user.id.split(':')[0] + '@s.whatsapp.net') && body) {
            const groupCodeMatch = body.match(/chat\.whatsapp\.com\/(?:invite\/)?([\w\d]*)/);
            if (groupCodeMatch && groupCodeMatch.length === 2 && !groupAdmins.includes(sender)) {
                const groupCode = groupCodeMatch[1];
                const currentGroupCode = await client.groupInviteCode(from);

                if (groupCode !== currentGroupCode) {
                    await client.sendMessage(from, { delete: M.key });
                    await client.groupParticipantsUpdate(from, [sender], 'remove');
                    return M.reply('Successfully removed an intruder!');
                }
            }
        }

        // Random reactions
        const specialUsers = ["919529426293@s.whatsapp.net", "917758924068@s.whatsapp.net", "917638889076@s.whatsapp.net", "917980329866@s.whatsapp.net", "916000764396@s.whatsapp.net"];
        if (specialUsers.includes(sender)) {
            const reactions = ["👻", "🐼", "🙈", "🐨", "🐷", "🐹", "🦄", "🐸", "🐶", "🦊"];
            const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
            const reactionMessage = { react: { text: randomReaction, key: M.key } };
            await client.sendMessage(from, reactionMessage);
        }

        // Auto chat bot
        if (M.quoted?.participant) M.mentions.push(M.quoted.participant);
        if (M.mentions.includes(client.user.id.split(':')[0] + '@s.whatsapp.net') && !isCmd && isGroup) {
            const response = await axios.get(`https://hercai.onrender.com/beta/hercai?question=${encodeURIComponent(body)}`, {
                headers: {
                    'content-type': 'application/json'
                }
            });
            M.reply(body.toLowerCase() === 'hi' ? `Hey ${M.pushName}, what's up?` : response.data.reply);
        }

        // Link handling
        if (!isGroup && body.includes('chat.whatsapp.com')) {
            const senderInfo = M.pushName || sender;
            const messageToMods = `WhatsApp link sent by: ${senderInfo}\nLink: ${body}`;
            await client.sendMessage(from, { text: 'Your request has been sent.' });
            const modsGroupJid = client.groups.adminsGroup;
            await client.sendMessage(modsGroupJid, { text: messageToMods, mentions: [M.sender] });
        }

        // Group responses
        if (['bot', 'aurora'].includes(body.toLowerCase())) {
            const responses = {
                bot: `Everything is working fine ${M.pushName}`,
                aurora: 'Aurora is a bot created for entertainment purposes, featuring the anime-themed card game of shoob.gg and the Pokémon adventure game of Nintendo.'
            };
            return M.reply(responses[body.toLowerCase()]);
        }

        if (isCmd && !cmdName) return M.reply('I am alive, use -help to get started.');

        client.log(
            `${chalk[isCmd ? 'red' : 'green'](`${isCmd ? '~EXEC' : '~RECV'}`)} ${isCmd ? `${client.prefix}${cmdName}` : 'Message'} ${chalk.white('from')} ${M.pushName} ${chalk.white('in')} ${isGroup ? gcName : 'DM'} ${chalk.white(`args: [${chalk.blue(args.length)}]`)}`,
            'yellow'
        );

        if (!isCmd) return;

        const bannedUser = banned.find(b => b.user === sender);
        if (isCmd && bannedUser) {
            return M.reply(`You are banned from using the bot. Reason: ${bannedUser.reason}`);
        }

        const command = client.cmd.get(cmdName) || client.cmd.find(cmd => cmd.aliases && cmd.aliases.includes(cmdName));

        if (!command) {
            const similarCommands = client.cmd.filter(cmd => cmd.name.includes(cmdName) || (cmd.aliases && cmd.aliases.includes(cmdName)));
            similarCommands.sort((a, b) => a.name.length - b.name.length);
            const suggestedCommand = similarCommands.first();

            return M.reply(suggestedCommand ? `No such command found! Did you mean: ${suggestedCommand.name}?` : '*No such command found Senpai!! 💟*');
        }

        const disabledCommands = await client.DB.get('disable-commands') || [];
        const disabledCmd = disabledCommands.find(cmd => cmd.command === cmdName || (command.aliases && command.aliases.includes(cmd.command)));
        if (disabledCmd) {
            const disabledAt = new Date(disabledCmd.disabledAt).toLocaleString();
            const reason = disabledCmd.reason || 'No reason provided.';
            return M.reply(`This command is currently disabled by ${disabledCmd.disabledBy}. Reason: ${reason}. Disabled at: ${disabledAt}`);
        }

        const cooldownAmount = (command.cool ?? 5) * 1000;
        const cooldownKey = `${sender}${command.name}`;

        if (!senderIsMod && cool.has(cooldownKey)) {
            const remainingTime = client.utils.convertMs(cool.get(cooldownKey) - Date.now());
            return M.reply(`You are on a cooldown. Wait *${remainingTime}* before using this command again.`);
        } else if (!senderIsMod) {
            cool.set(cooldownKey, Date.now() + cooldownAmount);
            setTimeout(() => cool.delete(cooldownKey), cooldownAmount);
        }

        if (command.react) {
            await client.sendMessage(from, { react: { text: command.react, key: M.key } });
        }

        const commandExecutionChecks = [
            { condition: !groupAdmins.includes(sender) && command.category === 'moderation', message: 'This command can only be used by group or community admins.' },
            { condition: !groupAdmins.includes(client.user.id.split(':')[0] + '@s.whatsapp.net') && command.category === 'moderation', message: 'This command can only be used when the bot is an admin.' },
            { condition: !isGroup && command.category === 'moderation', message: 'This command is meant to be used in groups.' },
            { condition: !isGroup && !senderIsMod, message: 'Bot can only be accessed in groups.' },
            { condition: !senderIsMod && command.category === 'dev', message: 'This command can only be accessed by the mods.' },
            {
                condition:
                    command.category === 'pokemon' &&
                    !companion &&
                    !['start-journey', 'spawnpokemon'].includes(command.name),
                message: 'You haven\'t started your journey yet.'
            },
            { condition: command.category === 'economy' && !economy && command.name !== 'bonus', message: 'Use :bonus to get started.' }
        ];

        for (const check of commandExecutionChecks) {
            if (check.condition) return M.reply(check.message);
        }

        await command.execute(client, arg, M);
        await client.exp.add(sender, command.exp ?? 0);

        if (Math.floor(Math.random() * 500) < 10) {
            const surpriseImages = [
                join(process.cwd(), 'assets/Images/battle.png'),
                join(process.cwd(), 'assets/Images/pokeball.png'),
                join(process.cwd(), 'assets/Images/greyPokeball.png')
            ];
            const randomImage = surpriseImages[Math.floor(Math.random() * surpriseImages.length)];
            await client.sendMessage(from, { image: { url: randomImage }, caption: "🐻✨ Have a bear-y nice day! ✨🐻" });
        }

    } catch (err) {
        console.error(err);
    }
};
