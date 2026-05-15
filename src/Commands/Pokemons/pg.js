const { getMaxPartySize } = require('../../Helpers/premium')

module.exports = {
    name: "pokemongive",
    aliases: ["pg", "gpm"],
    exp: 3,
    cool: 5,
    react: "🎁",
    category: "pokemon",
    description: "Give a Pokémon from your party to another user.",
    usage: 'pokemongive <index> <@user> | pokemongive confirm | pokemongive reject',
    async execute(client, arg, M) {
        const args = arg.split(' ');
        return initiatePokemonGive(client, args, M);
    }
};

async function handleConfirmationOrRejection(client, action, M) {
    const confirmationMap = await client.poke.get(`${M.sender}_Confirm`);
    if (!confirmationMap) {
        return M.reply('You have no pending Pokémon give operations.');
    }

    try {
        const { pokemonIndex, mentionedUser, from } = confirmationMap;
        const sender = M.sender;
        const senderParty = await client.poke.get(`${sender}_Party`) || [];
        const targetParty = await client.poke.get(`${mentionedUser}_Party`) || [];

        if (action === 'confirm') {
            if (pokemonIndex < 0 || pokemonIndex >= senderParty.length) {
                await client.poke.delete(`${M.sender}_Confirm`);
                return M.reply("The Pokémon index is invalid or the Pokémon is no longer available.");
            }

            const targetKey = String(mentionedUser.split('@')[0])
            const targetMax = await getMaxPartySize(client, targetKey).catch(() => 6)
            const pokemon = senderParty[pokemonIndex];

            if (targetParty.length >= targetMax) {
                await client.poke.delete(`${M.sender}_Confirm`);
                return M.reply(`Receiver's party is full (${targetMax} slots). Pokémon was not transferred.`);
            }

            senderParty.splice(pokemonIndex, 1);
            await client.poke.set(`${sender}_Party`, senderParty);

            targetParty.push(pokemon);
            await client.poke.set(`${mentionedUser}_Party`, targetParty);

            const text = `✔ @${sender.split('@')[0]} has transferred *${pokemon.name}* (Level: ${pokemon.level}) to @${mentionedUser.split('@')[0]}.`;
            await client.sendMessage(from, { text: text, mentions: [sender, mentionedUser] });

            if (client.groups?.adminsGroup) {
                await client.sendMessage(client.groups.adminsGroup, { text: `${text} in ${M.from}`, mentions: [sender, mentionedUser] });
            }

        } else if (action === 'reject') {
            await client.poke.delete(`${M.sender}_Confirm`);
            return M.reply("Pokémon give operation has been cancelled.");
        }

        await client.poke.delete(`${M.sender}_Confirm`);

    } catch (err) {
        console.error(err);
        await client.sendMessage(M.from, {
            text: "An error occurred while processing the Pokémon give operation."
        });
    }
}

async function initiatePokemonGive(client, args, M) {
    try {
        let index = parseInt(args[0]);
        let mentionedUser = M.mentions[0] || M.quoted?.participant || null;

        if (!index && args.length >= 2) {
            index = parseInt(args[1]);
            mentionedUser = mentionedUser || M.mentions[0] || M.quoted?.participant || null;
        }
        const sender = M.sender;
        const senderParty = await client.poke.get(`${sender}_Party`) || [];

        if (!mentionedUser) {
            return M.reply("Please mention or reply to the user you want to give the Pokémon to.");
        }

        const targetParty = await client.poke.get(`${mentionedUser}_Party`) || [];
        const targetKey = String(mentionedUser.split('@')[0])
        const targetMax = await getMaxPartySize(client, targetKey).catch(() => 6)

        if (senderParty.length === 0) {
            return M.reply("Your Pokémon party is empty!");
        }

        if (isNaN(index) || index <= 0 || index > senderParty.length) {
            return M.reply("❌ Please provide a valid index of the Pokémon you want to give.");
        }

        const pokemon = senderParty[index - 1];

        if (targetParty.length >= targetMax) {
            // Party full — send to PC instead
            const targetPc = client.getPc ? await client.getPc(mentionedUser) : (await client.poke.get(`${mentionedUser}_PSS`)) || [];
            targetPc.push(pokemon);
            if (client.setPc) await client.setPc(mentionedUser, targetPc);
            else await client.poke.set(`${mentionedUser}_PSS`, targetPc);

            senderParty.splice(index - 1, 1);
            await client.poke.set(`${sender}_Party`, senderParty);

            const text = `✔ @${sender.split('@')[0]} transferred *${pokemon.name}* (Lv. ${pokemon.level}) to @${mentionedUser.split('@')[0]}. Their party is full (${targetMax}) — sent to PC instead.`;
            await client.sendMessage(M.from, { text: text, mentions: [sender, mentionedUser] });

            if (client.groups?.adminsGroup) {
                await client.sendMessage(client.groups.adminsGroup, { text: `${text} in ${M.from}`, mentions: [sender, mentionedUser] });
            }
            return;
        }

        senderParty.splice(index - 1, 1);
        await client.poke.set(`${sender}_Party`, senderParty);

        targetParty.push(pokemon);
        await client.poke.set(`${mentionedUser}_Party`, targetParty);

        const text = `✔ @${sender.split('@')[0]} has transferred *${pokemon.name}* (Level: ${pokemon.level}) to @${mentionedUser.split('@')[0]}.`;
        await client.sendMessage(M.from, { text: text, mentions: [sender, mentionedUser] });

        if (client.groups?.adminsGroup) {
            await client.sendMessage(client.groups.adminsGroup, { text: `${text} in ${M.from}`, mentions: [sender, mentionedUser] });
        }

    } catch (err) {
        console.error(err);
        await client.sendMessage(M.from, {
            text: "An error occurred while initiating the Pokémon give operation."
        });
    }
}
