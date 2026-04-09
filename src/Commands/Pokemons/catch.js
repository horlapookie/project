module.exports = {
    name: "catch",
    aliases: ["catch"],
    exp: 5,
    cool: 4,
    react: "✅",
    usage: 'Use :catch',
    category: "pokemon",
    description: "Claim a spawned wild Pokemon and start a battle with it",
    async execute(client, arg, M) {
        try {
            if (!client.pokemonResponse.has(M.from)) {
                return M.reply("🟥 *There aren't any wild pokemons to catch*");
            }

            const data = await client.pokemonResponse.get(M.from);
            if (data.catchLockedUntil && Date.now() < data.catchLockedUntil && data.spawnedBy && data.spawnedBy !== M.sender) {
                const remainingSeconds = Math.ceil((data.catchLockedUntil - Date.now()) / 1000)
                return client.sendMessage(M.from, {
                    text: `Only *@${data.spawnedBy.split('@')[0]}* can start this wild battle for the first ${remainingSeconds}s.`,
                    mentions: [data.spawnedBy]
                }, { quoted: M })
            }

            if (client.pokemonBattleResponse.has(M.from)) {
                return M.reply('A Pokemon battle is already happening in this chat.')
            }
            if (client.pokemonBattlePlayerMap.has(M.sender)) {
                return M.reply('You are already in another Pokemon battle right now.')
            }

            const party = await client.poke.get(`${M.sender}_Party`) || [];
            const availableParty = party.filter((pokemon) => pokemon.hp > 0);
            if (!availableParty.length) {
                return M.reply("You don't have any Pokemon capable of battling right now.")
            }

            client.pokemonResponse.delete(M.from);
            const wildUser = `wild-${M.from.replace(/[^a-zA-Z0-9]/g, '')}@pokemon`;
            const wildParty = [{ ...data }];
            const expiresAt = Date.now() + 5 * 60 * 1000;

            await client.poke.set(`${wildUser}_Party`, wildParty);

            client.pokemonBattleResponse.set(M.from, {
                mode: 'wild',
                wildUser,
                wildPokemon: { ...data },
                wildRewardPending: true,
                expiresAt,
                player1: {
                    user: M.sender,
                    ready: false,
                    move: '',
                    activePokemon: availableParty[0]
                },
                player2: {
                    user: wildUser,
                    ready: true,
                    move: '',
                    activePokemon: wildParty[0]
                },
                turn: 'player1',
                players: [M.sender]
            });
            client.pokemonBattlePlayerMap.set(M.sender, M.from);

            const image = await client.utils.drawPokemonBattle({
                player1: { activePokemon: availableParty[0], party: availableParty },
                player2: { activePokemon: wildParty[0], party: wildParty }
            });

            await client.sendMessage(M.from, {
                image,
                caption: `🌀 *A wild battle started!* 🌀\n\n*@${M.sender.split('@')[0]}* sent out *${client.utils.capitalize(availableParty[0].name)}*.\n\nA wild *${client.utils.capitalize(data.name)}* appeared at Level *${data.level}*.\n\nUse one of the options below:\n\n- *${client.prefix}battle fight* to attack\n- *${client.prefix}battle items* to browse items in your bag\n- *${client.prefix}battle switch* to switch Pokemon\n- *${client.prefix}battle pokeballs* to check your pokeballs\n- *${client.prefix}battle run* to run away`,
                mentions: [M.sender]
            });

            setTimeout(async () => {
                const battle = client.pokemonBattleResponse.get(M.from);
                if (!battle || battle.mode !== 'wild' || battle.player1.user !== M.sender || battle.expiresAt !== expiresAt) {
                    return;
                }

                client.pokemonBattleResponse.delete(M.from);
                client.pokemonBattlePlayerMap.delete(M.sender);
                await client.poke.delete(`${wildUser}_Party`);
                await client.sendMessage(M.from, {
                    text: `The wild *${client.utils.capitalize(data.name)}* fled because the battle took too long.`
                });
            }, 5 * 60 * 1000);

        } catch (err) {
            console.error(err);
            await client.sendMessage(M.from, {
                image: { url: `${client.utils.errorChan()}` },
                caption: `${client.utils.greetings()} Error-Chan Dis\n\nError:\n${err}`
            });
        }
    },
};
