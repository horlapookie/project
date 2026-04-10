const { getBinaryNodeChild, areJidsSameUser } = require('@whiskeysockets/baileys');
const { serialize } = require('../Structures/WAclient');
const { getStats } = require('../Helpers/Stats');
const chalk = require('chalk');
const axios = require('axios');
const cron = require("node-cron");
const { Collection } = require('discord.js');
const { join } = require('path');
const cool = new Collection();
const normalizeNumber = (value = '') => String(value).replace(/\D/g, '');
const stripDevice = (jid = '') => String(jid || '').replace(/:\d+(?=@)/, '');

module.exports = MessageHandler = async (messages, client) => {
    try {
        if (messages.type !== 'notify') return;

        let M = serialize(JSON.parse(JSON.stringify(messages.messages[0])), client);
        if (!M.message) return;
        if (M.key && M.key.remoteJid === 'status@broadcast') return;
        if (['protocolMessage', 'senderKeyDistributionMessage', '', null].includes(M.type)) return;

        // Persist a best-effort mapping between LID ids and phone numbers so mod commands
        // can target users via reply/tag even when WhatsApp uses @lid addressing.
        try {
            const senderDigits = normalizeNumber(M.senderNumber || '');
            const senderLidDigits = normalizeNumber(String(M.senderLid || '').split('@')[0]);
            const senderPnDigits = normalizeNumber(String(M.senderPn || '').split('@')[0]);

            // If we have both a LID and a phone-number identity, store both directions.
            // This is important because mentions often come as @lid even when a user previously
            // talked as @s.whatsapp.net (or vice-versa).
            const pnDigits = senderPnDigits || senderDigits;
            const lidDigits =
                senderLidDigits ||
                (typeof M.sender === 'string' && M.sender.endsWith('@lid')
                    ? normalizeNumber(String(M.sender).split('@')[0])
                    : '');

            if (lidDigits && pnDigits) {
                await client.DB.set(`lid-map-${lidDigits}`, pnDigits);
                await client.DB.set(`pn-map-${pnDigits}`, lidDigits);
            }
        } catch (_) {
            // ignore mapping failures
        }

    const { isGroup, sender, from, body } = M;
    const gcMeta = isGroup ? await client.groupMetadata(from) : null;
    const gcName = isGroup ? gcMeta.subject : '';
        const prefixes = Array.from(new Set([client.prefix, client.altPrefix || '#'].filter(Boolean)));
        const prefixUsed = prefixes.find((p) => body.startsWith(p)) || '';
        const isCmd = Boolean(prefixUsed);
        const cmdName = isCmd
            ? body.slice(prefixUsed.length).trim().split(/\s+/).shift().toLowerCase()
            : '';
        const args = body.trim().split(/\s+/).slice(1);
        const arg = isCmd ? body.replace(cmdName, '').slice(prefixUsed.length).trim() : '';
    const groupMembers = gcMeta?.participants || [];
    const getParticipantJid = (p) => stripDevice(p?.id || p?.jid || '');

    const groupAdmins = groupMembers
        .filter((p) => Boolean(p?.admin))
        .map((p) => getParticipantJid(p))
        .filter(Boolean);

    const botBase = normalizeNumber(String(client.user?.id || '').split('@')[0]);
    const botCandidates = Array.from(
        new Set(
            [
                client.user?.id,
                stripDevice(client.user?.id),
                client.meLid,
                stripDevice(client.meLid),
                client.user?.lid,
                stripDevice(client.user?.lid),
                botBase ? `${botBase}@s.whatsapp.net` : null,
                botBase ? `${botBase}@lid` : null,
                botBase || null
            ].filter(Boolean)
        )
    );

    const sameDigits = (a, b) => {
        const da = normalizeNumber(stripDevice(a).split('@')[0]);
        const db = normalizeNumber(stripDevice(b).split('@')[0]);
        return Boolean(da) && da === db;
    };

    const findParticipant = (jid) =>
        groupMembers.find((p) => {
            const pid = getParticipantJid(p);
            const candidate = stripDevice(jid);
            return (
                (pid && candidate && areJidsSameUser(pid, candidate)) ||
                (pid && candidate && pid === candidate) ||
                (pid && candidate && sameDigits(pid, candidate))
            );
        });

    const botParticipant = isGroup ? botCandidates.map(findParticipant).find(Boolean) : null;
    const botIsAdmin = isGroup ? Boolean(botParticipant?.admin) : false;

    const senderCandidates = Array.from(new Set([M.sender, ...(M.senderAltIds || [])].filter(Boolean)));
    const senderParticipant = isGroup
        ? senderCandidates.map(findParticipant).find(Boolean)
        : null;
    const senderIsGroupAdmin = isGroup ? Boolean(senderParticipant?.admin) : false;
        const ActivateMod = (await client.DB.get('mod')) || [];
        const ActivateChatBot = (await client.DB.get('chatbot')) || [];
        const banned = (await client.DB.get('banned')) || [];
        const companion = await client.poke.get(`${sender}_Companion`);
        const economy = await client.getEcon(M);
        const senderIsMod = client.isMod(M);

        // Antilink system
    if (isGroup && ActivateMod.includes(from) && botIsAdmin && body) {
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
	    if (
	        M.mentions.some((jid) => botCandidates.some((candidate) => areJidsSameUser(candidate, jid))) &&
	        !isCmd &&
	        isGroup
	    ) {
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
            const modsGroupJid = client.groups?.adminsGroup;
            if (modsGroupJid) {
                await client.sendMessage(modsGroupJid, { text: messageToMods, mentions: [M.sender] });
            }
        }

        // Group responses
        if (['bot', 'aurora'].includes(body.toLowerCase())) {
            const responses = {
                bot: `Everything is working fine ${M.pushName}`,
                aurora: 'Aurora is a bot created for entertainment purposes, featuring the anime-themed card game of shoob.gg and the Pokémon adventure game of Nintendo.'
            };
            return M.reply(responses[body.toLowerCase()]);
        }

        if (isCmd && !cmdName) return M.reply(`I am alive, use ${client.prefix}help to get started.`);

        client.log(
            `${chalk[isCmd ? 'red' : 'green'](`${isCmd ? '~EXEC' : '~RECV'}`)} ${isCmd ? `${prefixUsed}${cmdName}` : 'Message'} ${chalk.white('from')} ${M.pushName} ${chalk.white('in')} ${isGroup ? gcName : 'DM'} ${chalk.white(`args: [${chalk.blue(args.length)}]`)}`,
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
            { condition: !senderIsGroupAdmin && command.category === 'moderation', message: 'This command can only be used by group or community admins.' },
            { condition: !botIsAdmin && command.category === 'moderation', message: 'This command can only be used when the bot is an admin.' },
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
            { condition: command.category === 'economy' && !economy && command.name !== 'bonus', message: `Use ${client.prefix}bonus to get started.` }
        ];

        for (const check of commandExecutionChecks) {
            if (check.condition) return M.reply(check.message);
        }

        await command.execute(client, arg, M);
        const xpKey = client.getUserNumber(M) || sender;
        await client.exp.add(xpKey, command.exp ?? 0);

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
