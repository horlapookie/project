const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const axios = require('axios');
const { getInventory, setInventoryQuantity, addInventoryQuantity } = require('../../Helpers/pokeballs');

const isWildUser = (user = '') => typeof user === 'string' && user.endsWith('@pokemon');

const formatBattleActor = (client, user, pokemonName) =>
    isWildUser(user)
        ? `the wild *${client.utils.capitalize(pokemonName)}*`
        : `*@${user.split('@')[0]}*'s *${client.utils.capitalize(pokemonName)}*`;

const formatBattleTrainer = (user = '') =>
    isWildUser(user) ? 'the wild Pokemon' : `*@${user.split('@')[0]}*`;

const getPartyForUser = async (client, user) => (await client.poke.get(`${user}_Party`)) || [];

const savePartyForUser = async (client, user, party) => {
    await client.poke.set(`${user}_Party`, party);
};

const cleanupWildBattle = async (client, battle) => {
    if (battle?.wildUser) {
        await client.poke.delete(`${battle.wildUser}_Party`);
    }
};

const ensureBattleNotExpired = async (client, M, battle) => {
    if (!battle || !battle.expiresAt) return false;
    if (battle.isDungeon && battle.dungeonExpiresAt && Date.now() > Number(battle.dungeonExpiresAt)) {
        const jid = M.from;
        const players = Array.isArray(battle.players)
            ? battle.players
            : [battle.player1?.user, battle.player2?.user].filter(Boolean);
        for (const p of players) {
            if (!p || isWildUser(p)) continue;
            client.pokemonBattlePlayerMap.delete(p);
        }
        await cleanupWildBattle(client, battle);
        if (client.unpersistBattleSync) client.unpersistBattleSync(jid);
        else client.pokemonBattleResponse.delete(jid);
        await client.DB.delete(`ashen-active-${jid}`).catch(() => null);
        await client.DB.set(`ashen-last-${jid}`, Date.now()).catch(() => null);
        await client.sendMessage(jid, { text: '🔥 Ashen Sanctum closed after 40 minutes.' }).catch(() => null);
        return true;
    }
    if (Date.now() <= Number(battle.expiresAt)) return false;

    const jid = M.from;
    // Cleanup maps
    const players = Array.isArray(battle.players)
        ? battle.players
        : [battle.player1?.user, battle.player2?.user].filter(Boolean);
    for (const p of players) {
        if (!p || isWildUser(p)) continue;
        client.pokemonBattlePlayerMap.delete(p);
    }

    await cleanupWildBattle(client, battle);
    if (client.unpersistBattleSync) client.unpersistBattleSync(jid);
    else client.pokemonBattleResponse.delete(jid);

    const msg = battle.isDungeon
        ? '🔥 Ashen Sanctum ended because nobody made a move for 10 minutes.'
        : battle.mode === 'wild'
        ? `The wild *${client.utils.capitalize(battle.player2.activePokemon.name)}* fled because nobody made a move for 10 minutes.`
        : 'This Pokemon battle was cancelled due to 10 minutes of inactivity.';
    await client.sendMessage(jid, { text: msg }).catch(() => null);
    return true;
};

const setBattleData = (client, jid, data) => {
    if (client.persistBattleSync) return client.persistBattleSync(jid, data);
    return client.pokemonBattleResponse.set(jid, data);
};

const pickWildMove = (battle) => {
    const availableMoves = (battle.player2.activePokemon.moves || []).filter((move) => move.pp > 0);
    if (!availableMoves.length) return 'skipped';
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
};

const updateActivePokemonInParty = async (client, user, pokemon) => {
    const party = await getPartyForUser(client, user);
    const index = party.findIndex((entry) => entry.tag === pokemon.tag);
    if (index >= 0) {
        party[index] = pokemon;
        await savePartyForUser(client, user, party);
    }
    return party;
};

const clearQueuedMoves = (battle) => {
    battle.player1.move = '';
    battle.player2.move = '';
};

const touchBattleExpiry = (client, battle) => {
    if (!battle) return;
    const now = Date.now();
    battle.lastActivityAt = now;
    battle.expiresAt = now + (client.BATTLE_TIMEOUT_MS || 10 * 60 * 1000);
};

const buildBattleOptionsText = (client, battle, currentUser) => {
    if (battle.mode === 'wild') {
        const lines = [
            `Use one of the options given below ${formatBattleTrainer(currentUser.user)}`,
            '',
            `- To fight use *${client.prefix}battle fight*`,
            '',
            `- To switch pokemon use *${client.prefix}battle switch*`
        ];
        if (battle.isDungeon) {
            lines.push('', `- To quit the dungeon use *${client.prefix}ashen quit*`);
        } else if (!battle.noCapture) {
            lines.push('', `- To check the pokeballs in your bag use *${client.prefix}battle pokeballs*`);
            lines.push('', `- To run away from this battle use *${client.prefix}battle run*`);
        } else {
            lines.push('', `- To forfeit this battle use *${client.prefix}battle forfeit*`);
        }
        return lines.join('\n');
    }

    return `Use one of the options given below ${formatBattleTrainer(currentUser.user)}\n\nTo fight, use *${client.prefix}battle fight*\n\nTo switch Pokemon, use *${client.prefix}battle switch*\n\nTo forfeit this battle, use *${client.prefix}battle forfeit*`;
};

const sendBattleState = async (client, M, battle, extra = {}) => {
    const player1Party = await getPartyForUser(client, battle.player1.user);
    const player2Party = await getPartyForUser(client, battle.player2.user);
    const image = await client.utils.drawPokemonBattle({
        player1: { activePokemon: battle.player1.activePokemon, party: player1Party },
        player2: { activePokemon: battle.player2.activePokemon, party: player2Party },
        captureBall: extra.captureBall || null
    });

    return client.sendMessage(M.from, {
        image,
        jpegThumbnail: image.toString('base64'),
        ...(extra.text ? { caption: extra.text } : {})
    });
};

const tryCatchWildPokemon = async (client, M, battle, ball) => {
    const userKey = (await client.resolveNumber(M)) || client.getUserNumber(M) || M.sender
    const inventory = await getInventory(client, userKey);
    const ownedBall = inventory.find((item) => item.key === ball.key);
    if (!ownedBall || ownedBall.quantity < 1) {
        return M.reply(`You do not have any ${ball.name}s left.`)
    }

    await setInventoryQuantity(client, userKey, ball.key, ownedBall.quantity - 1);

    const wildPokemon = battle.player2.activePokemon;
    const hpPercent = wildPokemon.maxHp > 0 ? (wildPokemon.hp / wildPokemon.maxHp) * 100 : 100;
    const damagePercent = 100 - hpPercent;
    const requiredDamage = 100 - ball.successRate;
    const caught = ball.successRate >= 100 || damagePercent >= requiredDamage;

    await sendBattleState(client, M, battle, {
        captureBall: ball.key,
        text: `*@${M.sender.split('@')[0]}* used *${ball.name}* on *${client.utils.capitalize(wildPokemon.name)}*!`,
    });

    if (caught) {
        try {
            // Award some XP for a successful capture.
            await handleStats(client, M, wildPokemon.exp, M.sender, battle.player1.activePokemon, 'player1');
        } catch (_) {
            // ignore xp errors
        }

        const capturedPokemon = { ...wildPokemon, hp: Math.max(1, wildPokemon.hp) };
        const party = await getPartyForUser(client, M.sender);
        const pc = client.getPc ? await client.getPc(M.sender) : (await client.poke.get(`${M.sender}_PSS`)) || [];

        if (party.length >= 6) pc.push(capturedPokemon);
        else party.push(capturedPokemon);

        await savePartyForUser(client, M.sender, party);
        if (client.setPc) await client.setPc(M.sender, pc);
        else await client.poke.set(`${M.sender}_PSS`, pc);
        await cleanupWildBattle(client, battle);
        client.pokemonBattleResponse.delete(M.from);
        client.pokemonBattlePlayerMap.delete(M.sender);

        return client.sendMessage(M.from, {
            text: `🎉 *@${M.sender.split('@')[0]}* caught *${client.utils.capitalize(capturedPokemon.name)}* using *${ball.name}*!${party.length >= 6 ? ' It was sent to your PC.' : ''}`,
            mentions: [M.sender]
        });
    }

    await client.sendMessage(M.from, {
        text: `*@${M.sender.split('@')[0]}* used *${ball.name}* on *${client.utils.capitalize(wildPokemon.name)}*, but it broke free!`,
        mentions: [M.sender]
    });

    battle.player2.move = pickWildMove(battle);
    battle.turn = 'player1';
    setBattleData(client, M.from, battle);
    return handleBattles(client, M);
};

module.exports = {
    name: 'battle',
    aliases: ['bt'],
    exp: 5,
    // Applies to all `battle ...` sub-actions because they are handled within this command.
    cool: 6,
    react: '🟩',
    category: 'pokemon',
    usage: 'Use {prefix}battle fight / switch / forfeit',
    description: 'Battle another trainer or a wild Pokemon',
    async execute(client, arg, M) {
        const context = arg.trim().toLowerCase();
        const data = client.pokemonBattleResponse.get(M.from);

        if (await ensureBattleNotExpired(client, M, data)) return;
        if (data?.isDungeon && data?.dungeonClosesAt && Date.now() > Number(data.dungeonClosesAt)) {
            if (client.unpersistBattleSync) client.unpersistBattleSync(M.from);
            else client.pokemonBattleResponse.delete(M.from);
            client.pokemonBattlePlayerMap.delete(M.sender);
            await cleanupWildBattle(client, data);
            await client.sendMessage(M.from, {
                text: '🔥 Ashen Sanctum has closed due to the 40-minute time limit.'
            });
            return;
        }

        const canControlBattle =
            data &&
            (data.players.includes(M.sender) || (data.mode === 'wild' && data.player1.user === M.sender));

        if (!data || !canControlBattle) {
            return M.reply(`You aren't battling anyone here.`);
        }

        if (!context) {
            return M.reply('Invalid Usage!');
        }

        const [action, indexStr] = context.split(' ');
        const number = parseInt(indexStr, 10) - 1;

        if (action === 'continue') {
            const battle = client.pokemonBattleResponse.get(M.from);
            if (!battle) return null;
            if (!battle.isDungeon || !battle.awaitingContinue) {
                return M.reply('Nothing to continue right now.')
            }
            if (battle.player1?.user !== M.sender) {
                return M.reply('Only the dungeon challenger can continue.')
            }
            touchBattleExpiry(client, battle);
            battle.awaitingContinue = false;
            battle.turn = 'player1';
            setBattleData(client, M.from, battle);
            return continueSelection(client, M);
        }

        // If we're waiting for the dungeon challenger to confirm the next encounter,
        // block other battle actions until they use "battle continue".
        if (data?.isDungeon && data?.awaitingContinue && action !== 'continue') {
            return M.reply(`Use *${client.prefix}battle continue* to face the next guardian, or *${client.prefix}ashen quit* to quit.`)
        }

        // Allow quitting actions even when it's not the user's turn.
        if (action === 'run') {
            if (data.mode !== 'wild') {
                // PvP doesn't support "run"; treat as forfeit guidance.
                return M.reply(`Use *${client.prefix}battle forfeit* for trainer battles.`)
            }
            if (data.isDungeon) {
                return M.reply(`You can't run from a dungeon. Use *${client.prefix}ashen quit*.`)
            }
            if (data.noCapture) {
                return M.reply(`You can't run from this battle. Use *${client.prefix}battle forfeit*.`)
            }
            touchBattleExpiry(client, data);
            if (client.unpersistBattleSync) client.unpersistBattleSync(M.from);
            else client.pokemonBattleResponse.delete(M.from);
            client.pokemonBattlePlayerMap.delete(data.player1.user);
            await cleanupWildBattle(client, data);
            return client.sendMessage(M.from, {
                text: `*@${M.sender.split('@')[0]}* ran away and the wild *${client.utils.capitalize(data.player2.activePokemon.name)}* fled.`,
                mentions: [M.sender]
            });
        }

        if (action === 'forfeit') {
            if (data.isDungeon) {
                return M.reply(`You can't forfeit a dungeon battle. Use *${client.prefix}ashen quit*.`)
            }
            // Works even when it's not the user's turn.
            if (data.mode === 'wild') {
                touchBattleExpiry(client, data);
                if (client.unpersistBattleSync) client.unpersistBattleSync(M.from);
                else client.pokemonBattleResponse.delete(M.from);
                client.pokemonBattlePlayerMap.delete(data.player1.user);
                await cleanupWildBattle(client, data);
                return client.sendMessage(M.from, {
                    text: `*@${M.sender.split('@')[0]}* forfeited and the wild *${client.utils.capitalize(data.player2.activePokemon.name)}* fled.`,
                    mentions: [M.sender]
                });
            }

            client.pokemonBattlePlayerMap.delete(data.player2.user);
            client.pokemonBattlePlayerMap.delete(data.player1.user);

            const user = data.player1.user === M.sender ? data.player1.user : data.player2.user;
            const winner = data.player1.user === M.sender ? data.player2.user : data.player1.user;

            const economy = await client.getEcon(M);
            const opponentId = data.player1.user === M.sender ? data.player2.user : data.player1.user
            const economy1 = await client.getEcon(opponentId);

            const econA = economy || await client.econ.create({ userId: M.sender });
            const econB = economy1 || await client.econ.create({ userId: data.player1.user === M.sender ? data.player2.user : data.player1.user });

            const wallet = econA ? (econA.gem || 0) : 0;
            const amount = wallet > 5000 ? 4500 : wallet >= 250 ? 250 : wallet;
            const gold = Math.floor(Math.random() * amount);

            econA.gem = (econA.gem || 0) + gold;
            econB.gem = (econB.gem || 0) - gold;

            await econA.save();
            await econB.save();

            if (client.unpersistBattleSync) client.unpersistBattleSync(M.from);
            else client.pokemonBattleResponse.delete(M.from);

            return client.sendMessage(M.from, {
                text: `🎉 Congrats! *@${winner.split('@')[0]}*, you won this battle and got *${gold}* gems from *@${user.split('@')[0]}* as they forfeited the battle.`,
                mentions: [user, winner]
            });
        }

        if (action === 'fight') {
            const battle = client.pokemonBattleResponse.get(M.from);
            if (!battle) return null;

            const isTurn = M.sender === battle[battle.turn].user;
            if (!isTurn) return M.reply('Not your turn');
            touchBattleExpiry(client, battle);

            if (isNaN(number)) {
                let text = `*Moves | ${client.utils.capitalize(battle[battle.turn].activePokemon.name)}*`;
                for (let i = 0; i < battle[battle.turn].activePokemon.moves.length; i++) {
                    const move = battle[battle.turn].activePokemon.moves[i];
                    text += `\n\n*#${i + 1}*\n❓ *Move:* ${move.name.split('-').map(client.utils.capitalize).join(' ')}\n〽 *PP:* ${move.pp} / ${move.maxPp}\n🎗 *Type:* ${client.utils.capitalize(move.type ?? 'Normal')}\n🎃 *Power:* ${move.power}\n🎐 *Accuracy:* ${move.accuracy}\n🧧 *Description:* ${move.description}\nUse *${client.prefix}battle fight ${i + 1}* to use this move.`;
                }
                return M.reply(text);
            }

            if (number < 0 || number >= battle[battle.turn].activePokemon.moves.length) {
                return M.reply('Invalid move number.');
            }

            const actor = battle[battle.turn];
            if (actor.activePokemon.hp <= 0) {
                return M.reply("You can't fight with a fainted Pokemon. Switch to another Pokemon.");
            }

            if (actor.activePokemon.moves[number].pp <= 0) {
                return M.reply("You can't use this move now as it has run out of PP.");
            }

            const move = actor.activePokemon.moves[number];
            actor.move = move;
            actor.activePokemon.moves[number].pp -= 1;
            await updateActivePokemonInParty(client, actor.user, actor.activePokemon);

            if (battle.mode === 'wild') {
                battle.player2.move = pickWildMove(battle);
                battle.turn = 'player1';
                setBattleData(client, M.from, battle);
                return handleBattles(client, M);
            }

            const otherKey = actor.user === battle.player1.user ? 'player2' : 'player1';
            const otherActor = battle[otherKey];

            if (!otherActor.move) {
                battle.turn = otherKey;
                setBattleData(client, M.from, battle);
                return client.sendMessage(M.from, {
                    text: buildBattleOptionsText(client, battle, otherActor),
                    mentions: isWildUser(otherActor.user) ? [] : [otherActor.user]
                });
            }

            battle.turn = 'player1';
            setBattleData(client, M.from, battle);
            return handleBattles(client, M);
        }

        if (action === 'items') {
            if (data.mode !== 'wild') {
                return M.reply('Items can only be browsed in wild battles right now.')
            }
            return M.reply('Items are not available right now. Use *battle pokeballs* to throw pokeballs.')
        }

        if (action === 'pokeballs') {
            if (data.mode !== 'wild') {
                return M.reply('Pokeballs can only be used in wild battles.')
            }
            if (data.isDungeon || data.noCapture) {
                return M.reply('You cannot use pokeballs in dungeon battles.')
            }

            const userKey = (await client.resolveNumber(M)) || client.getUserNumber(M) || M.sender
            const inventory = (await getInventory(client, userKey)).filter((item) => item.quantity > 0);
            if (!inventory.length) {
                return M.reply(`You do not have any pokeballs. Use *${client.prefix}mart* and *${client.prefix}mart-buy* to buy some.`)
            }

            const [, subAction, subIndex] = context.split(' ');
            if ((subAction || '').toLowerCase() === 'use') {
                const ball = inventory[Number(subIndex) - 1];
                if (!ball) {
                    return M.reply('Please provide a valid pokeball index from your bag.')
                }
                return tryCatchWildPokemon(client, M, data, ball);
            }

            const username = M.pushName || 'Trainer';
            const tag = `#${M.sender.replace(/\D/g, '').slice(-5) || '00000'}`;
            const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
            const lines = [
                '🎒 *Bag*',
                '',
                '🎴 *ID:*',
                ` 🏮 *Username:* ${username}`,
                ` 🧧 *Tag:* ${tag}`,
                '',
                '🎗 *Category:* Pokeballs',
                `〽 *Total Items:* ${totalItems}`,
                ''
            ];

            inventory.forEach((item, index) => {
                lines.push(
                    `*#${index + 1}*`,
                    `🎈 *Item:* ${item.name} (x${item.quantity})`,
                    `🧧 *Description:* ${item.description}`,
                    `*[Use ${client.prefix}battle pokeballs use ${index + 1} to use this pokeball]*`,
                    ''
                );
            });

            return M.reply(lines.join('\n').trim());
        }

        if (action === 'switch') {
            const battle = client.pokemonBattleResponse.get(M.from);
            if (!battle) return null;

            const isTurn = M.sender === battle[battle.turn].user;
            if (!isTurn) return M.reply('Not your turn');
            touchBattleExpiry(client, battle);

            if (isNaN(number)) {
                return M.reply(`Use *${client.prefix}battle switch <index>*`)
            }

            const party = await getPartyForUser(client, M.sender);
            if (number < 0 || number >= party.length || party[number].hp <= 0) {
                return M.reply("You can't send out a fainted Pokemon to battle.");
            }

            if (
                party[number].name === battle[battle.turn].activePokemon.name &&
                party[number].rejectedMoves.length === battle[battle.turn].activePokemon.rejectedMoves.length
            ) {
                return M.reply(`*${client.utils.capitalize(battle[battle.turn].activePokemon.name)}* is already out here.`);
            }

            const switcherKey = battle.turn;
            const otherKey = switcherKey === 'player1' ? 'player2' : 'player1';
            const wasFainted = battle[switcherKey].activePokemon.hp <= 0;

            const text = `*@${M.sender.split('@')[0]}* ${
                !wasFainted
                    ? `withdrew *${client.utils.capitalize(battle[switcherKey].activePokemon.name)}* from the battle and`
                    : ''
            } sent out *${client.utils.capitalize(party[number].name)}* for the battle.`;

            // Apply the switch to the correct player (this was the main bug).
            battle[switcherKey].activePokemon = party[number];
            await updateActivePokemonInParty(client, battle[switcherKey].user, battle[switcherKey].activePokemon);

            if (wasFainted) {
                // Forced switch: the switching player moves first next (your requested behavior).
                battle.turn = switcherKey;
            } else {
                // Voluntary switch consumes turn.
                battle[switcherKey].move = 'skipped';
                battle.turn = otherKey;
            }

            setBattleData(client, M.from, battle);

            await client.sendMessage(M.from, {
                mentions: [M.sender],
                text
            });
            await sendBattleState(client, M, battle);

            if (battle.mode === 'wild') {
                if (!wasFainted) {
                    // After a voluntary switch, wild attacks immediately.
                    battle.player2.move = pickWildMove(battle);
                    battle.turn = 'player1';
                    setBattleData(client, M.from, battle);
                    return handleBattles(client, M);
                }
                return continueSelection(client, M);
            }

            // PvP: if opponent already selected a move, resolve now so it hits the switched Pokemon.
            if (!wasFainted && battle[otherKey].move && battle[otherKey].move !== '') {
                battle.turn = 'player1';
                setBattleData(client, M.from, battle);
                return handleBattles(client, M);
            }

            return continueSelection(client, M);
        }

        if (action === 'pokemon') {
            return handlePokemonSelection(client, M);
        }

        return M.reply('Invalid Usage');
    }
};

const handlePokemonSelection = async (client, M) => {
    try {
        const battle = client.pokemonBattleResponse.get(M.from);
        if (!battle) return null;

        const isTurn = M.sender === battle[battle.turn].user;
        if (!isTurn) return M.reply('Not your turn');

        const party = await getPartyForUser(client, M.sender);
        let text = '';

        for (let i = 0; i < party.length; i++) {
            const pokemon = party[i];
            text += `*#${i + 1}*\n🟩 *Pokemon:* ${client.utils.capitalize(pokemon.name)}\n🟨 *Level:* ${pokemon.level}\n♻ *State:* ${pokemon.hp <= 0 ? 'Fainted' : pokemon.state.status === '' ? 'Fine' : client.utils.capitalize(pokemon.state.status)}\n🟢 *HP:* ${pokemon.hp} / ${pokemon.maxHp}\n🟧 *Types:* ${pokemon.types.map(client.utils.capitalize).join(', ')}\nUse *${client.prefix}battle switch ${i + 1}* to send out this Pokemon for the battle.`;
            if (i < party.length - 1) text += '\n\n';
        }

        await M.reply(text);
    } catch (error) {
        console.error('Error in handlePokemonSelection:', error);
    }
};

const handleBattles = async (client, M) => {
    try {
        const battle = client.pokemonBattleResponse.get(M.from);
        if (!battle) return;

        const turns = [battle.player1, battle.player2];
        turns.sort((a, b) => b.activePokemon.speed - a.activePokemon.speed);
        if (turns[0].move !== 'skipped' && turns[1].move !== 'skipped' && turns[0].move !== '' && turns[1].move !== '') {
            turns.sort((a, b) => b.move.accuracy - a.move.accuracy);
        }

        for (let i = 0; i < 2; i++) {
            const current = turns[i];
            const opponent = turns[i === 0 ? 1 : 0];

            if (current.activePokemon.hp <= 0) continue;
            if (current.move === 'skipped') continue;
            if (!current.move || current.move === '') continue;

            const move = current.move;
            if (typeof move !== 'object' || !move.name) {
                // Safety: sometimes a move can be an unexpected value; skip instead of crashing.
                current.move = '';
                setBattleData(client, M.from, battle);
                continue;
            }
            let moveLanded = move.accuracy === 100 || Math.floor(Math.random() * 100) < move.accuracy;

            if (['sleeping', 'paralysis'].includes(current.activePokemon.state.status)) {
                if (current.activePokemon.state.movesUsed > 0) {
                    current.activePokemon.state.movesUsed -= 1;

                    if (current.activePokemon.state.movesUsed < 1) {
                        await client.sendMessage(M.from, {
                            text: `${formatBattleActor(client, current.user, current.activePokemon.name)} is ${current.activePokemon.state.status === 'sleeping' ? 'awake now' : 'free from paralysis now'}`,
                            mentions: isWildUser(current.user) ? [] : [current.user]
                        });
                        await delay(3000);
                        current.activePokemon.state.status = '';
                        setBattleData(client, M.from, battle);
                        await updateActivePokemonInParty(client, current.user, current.activePokemon);
                    } else {
                        await client.sendMessage(M.from, {
                            text: current.activePokemon.state.status === 'sleeping'
                                ? `${formatBattleActor(client, current.user, current.activePokemon.name)} is fast asleep`
                                : `${formatBattleActor(client, current.user, current.activePokemon.name)} can't move because it's paralyzed`,
                            mentions: isWildUser(current.user) ? [] : [current.user]
                        });
                        await delay(3000);
                        setBattleData(client, M.from, battle);
                        continue;
                    }
                }
            }

            await client.sendMessage(M.from, {
                text: `${formatBattleActor(client, current.user, current.activePokemon.name)} used *${client.utils.capitalize(move.name.replace(/-/g, ' '))}* on ${formatBattleActor(client, opponent.user, opponent.activePokemon.name)}`,
                mentions: [current.user, opponent.user].filter((jid) => !isWildUser(jid))
            });
            await delay(5000);

            if (!moveLanded) {
                await client.sendMessage(M.from, {
                    text: `${formatBattleActor(client, current.user, current.activePokemon.name)} missed the attack`,
                    mentions: isWildUser(current.user) ? [] : [current.user]
                });
                continue;
            }

            const party1 = await getPartyForUser(client, current.user);
            const party2 = await getPartyForUser(client, opponent.user);
            const pokemon = current.activePokemon;
            const target = opponent.activePokemon;
            const party1Index = party1.findIndex((poke) => poke.tag === pokemon.tag);
            const party2Index = party2.findIndex((poke) => poke.tag === target.tag);

            if (move.stat_change.length && move.power <= 0) {
                for (const { target: statTarget, change } of move.stat_change) {
                    let text = `Due to *${client.utils.capitalize(move.name.replace(/-/g, ' '))}* used by ${formatBattleActor(client, current.user, pokemon.name)},`;
                    if (change < 0) {
                        text += ` the *${statTarget.toUpperCase()}* of ${formatBattleActor(client, opponent.user, target.name)} fell by ${Math.abs(change)}`;
                        target[statTarget] += change;
                    } else {
                        text += ` the *${statTarget.toUpperCase()}* of itself rose by ${change}`;
                        pokemon[statTarget] += change;
                    }

                    await client.sendMessage(M.from, {
                        text,
                        mentions: [current.user, opponent.user].filter((jid) => !isWildUser(jid))
                    });
                    await delay(3000);
                }

                party1[party1Index] = pokemon;
                party2[party2Index] = target;
                await savePartyForUser(client, current.user, party1);
                await savePartyForUser(client, opponent.user, party2);
                setBattleData(client, M.from, battle);
                continue;
            }

            if (move.drain > 0 || move.healing > 0) {
                if (move.drain > 0) {
                    const drain = Math.min(target.hp, move.drain);
                    target.hp -= drain;
                    pokemon.hp += drain;
                    await client.sendMessage(M.from, {
                        text: `${formatBattleActor(client, current.user, pokemon.name)} drained and restored *${drain} HP* from ${formatBattleActor(client, opponent.user, target.name)}`,
                        mentions: [current.user, opponent.user].filter((jid) => !isWildUser(jid))
                    });
                } else {
                    const heal = Math.min(move.healing, pokemon.maxHp - pokemon.hp);
                    pokemon.hp += heal;
                    await client.sendMessage(M.from, {
                        text: `${formatBattleActor(client, current.user, pokemon.name)} restored *${heal} HP*`,
                        mentions: isWildUser(current.user) ? [] : [current.user]
                    });
                }
                await delay(3000);
            }

            if (['sleep', 'paralysis', 'poison'].includes(move.effect)) {
                if (target.state.status === move.effect) {
                    await client.sendMessage(M.from, {
                        text: `${formatBattleActor(client, opponent.user, target.name)} is already ${move.effect === 'poison' ? 'poisoned' : move.effect === 'sleep' ? 'sleeping' : 'paralyzed'}`,
                        mentions: isWildUser(opponent.user) ? [] : [opponent.user]
                    });
                    await delay(5000);
                } else {
                    target.state.status = move.effect === 'sleep' ? 'sleeping' : move.effect === 'poison' ? 'poisoned' : 'paralyzed';
                    target.state.movesUsed = 5;
                }
            }

            const attack = pokemon.attack;
            const defense = target.defense;
            const typesData = await Promise.all(target.types.map((type) => client.utils.getPokemonWeaknessAndStrongTypes(type)));
            const weakness = typesData.flatMap((entry) => entry.weakness);
            const strong = typesData.flatMap((entry) => entry.strong);

            let effect = ((attack - defense) / 50) * move.power + Math.floor(Math.random() * 25);
            let effectiveness = '';

            if (weakness.includes(move.type)) effectiveness = 's';
            if (strong.includes(move.type) || target.types.includes(move.type)) effectiveness = 'w';
            if (move.type === 'normal') effectiveness = '';

            if (effectiveness === 'w') effect = Math.floor(Math.random() * effect);
            if (effectiveness === 's') effect *= 2;

            const calcDamage = Math.floor((move.power + effect) / 2.5);
            const result = Math.max(calcDamage, 5);

            if (effectiveness === 'w' || effectiveness === 's') {
                await client.sendMessage(M.from, {
                    text: `It's ${effectiveness === 'w' ? 'not' : 'super'} effective`
                });
            }

            target.hp -= result;
            await client.sendMessage(M.from, {
                text: `${formatBattleActor(client, current.user, pokemon.name)} dealt *${result}* damage to ${formatBattleActor(client, opponent.user, target.name)}`,
                mentions: [current.user, opponent.user].filter((jid) => !isWildUser(jid))
            });
            await delay(3000);

            party1[party1Index] = pokemon;
            party2[party2Index] = target;
            await savePartyForUser(client, current.user, party1);
            await savePartyForUser(client, opponent.user, party2);

            if (target.hp <= 0) {
                target.hp = 0;
                await client.sendMessage(M.from, {
                    text: `${formatBattleActor(client, opponent.user, target.name)} fainted`,
                    mentions: isWildUser(opponent.user) ? [] : [opponent.user]
                });
                await delay(5000);
                await sendBattleState(client, M, battle);
                // For wild battles, keep the turn on player1 so replacement logic runs correctly.
                battle.turn = battle.mode === 'wild' ? 'player1' : (current.user === battle.player1.user ? 'player2' : 'player1');
                await savePartyForUser(client, opponent.user, party2);
                setBattleData(client, M.from, battle);

                if (pokemon.level < 100 && !isWildUser(current.user)) {
                    // PvP: winner's pokemon earns the FULL exp value of the defeated pokemon.
                    // handleStats divides by 50 internally, so multiply here to compensate
                    // (wild battles keep the historic /50 reward via the unchanged handleStats path).
                    const xpAward = isWildUser(opponent.user) ? target.exp : (Number(target.exp) || 0) * 50;
                    await handleStats(
                        client,
                        M,
                        xpAward,
                        current.user,
                        pokemon,
                        opponent.user === battle.player1.user ? 'player2' : 'player1'
                    );
                }
            }

            // Always show the battlefield after a move so both players see the updated HP.
            await sendBattleState(client, M, battle);
            await delay(2500);
        }

        clearQueuedMoves(battle);
        setBattleData(client, M.from, battle);

        await continueSelection(client, M);
    } catch (error) {
        console.error('Error in handleBattle:', error);
    }
};

const continueSelection = async (client, M) => {
    try {
        const battle = client.pokemonBattleResponse.get(M.from);
        if (!battle) return;

        if (await ensureBattleNotExpired(client, M, battle)) return;

        const player1Party = await getPartyForUser(client, battle.player1.user);
        const player2Party = await getPartyForUser(client, battle.player2.user);

        const image = await client.utils.drawPokemonBattle({
            player1: { activePokemon: battle.player1.activePokemon, party: player1Party },
            player2: { activePokemon: battle.player2.activePokemon, party: player2Party }
        });

        const currentUser = battle[battle.turn];
        const opponent = battle[battle.turn === 'player1' ? 'player2' : 'player1'];

        const applyPoisonDamage = async (pokemon, userKey) => {
            if (pokemon.state.status === 'poisoned' && pokemon.hp > 0) {
                const damage = Math.floor(Math.random() * pokemon.hp);
                pokemon.hp -= damage;
                await client.sendMessage(M.from, {
                    text: `${formatBattleActor(client, userKey, pokemon.name)} took *${damage} HP* damage due to poisoning.`,
                    mentions: isWildUser(userKey) ? [] : [userKey]
                });
                await updateActivePokemonInParty(client, userKey, pokemon);
                setBattleData(client, M.from, battle);
            }
        };

        await applyPoisonDamage(currentUser.activePokemon, currentUser.user);
        await applyPoisonDamage(opponent.activePokemon, opponent.user);

        if (currentUser.activePokemon.hp <= 0) {
            const playerData = await getPartyForUser(client, currentUser.user);
            const alivePokemon = playerData.filter((pokemon) => pokemon.hp > 0);

            if (!alivePokemon.length) {
                return endBattle(client, M, opponent.user, currentUser.user);
            }

            await client.sendMessage(M.from, {
                text: `${formatBattleTrainer(currentUser.user)}, send out a Pokemon from your party by selecting from the list sent.`,
                mentions: isWildUser(currentUser.user) ? [] : [currentUser.user]
            });

            const originalSender = M.sender;
            M.sender = currentUser.user;
            await handlePokemonSelection(client, M);
            M.sender = originalSender;
            return;
        }

        if (opponent.activePokemon.hp <= 0) {
            const opponentData = await getPartyForUser(client, opponent.user);
            const alivePokemon = opponentData.filter((pokemon) => pokemon.hp > 0);

            if (!alivePokemon.length) {
                if (isWildUser(opponent.user)) {
                    const active = currentUser.activePokemon;
                    if (active && active.level < 100 && battle.lastXpAwardTag !== active.tag) {
                        try {
                            await handleStats(client, M, opponent.activePokemon.exp, currentUser.user, active, battle.turn);
                            battle.lastXpAwardTag = active.tag;
                            setBattleData(client, M.from, battle);
                        } catch (_) {
                            // ignore xp errors
                        }
                    }
                }
                return endBattle(client, M, currentUser.user, opponent.user);
            }

            if (isWildUser(opponent.user)) {
                // Dungeon: pause between guardians and require an explicit "battle continue".
                if (battle.isDungeon) {
                    const defeatedCount = opponentData.length - alivePokemon.length;
                    const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
                    const ordinal = ordinals[defeatedCount - 1] || `${defeatedCount}th`;

                    battle.player2.activePokemon = alivePokemon[0];
                    battle.player2.move = '';
                    battle.turn = 'player1';
                    battle.awaitingContinue = true;
                    touchBattleExpiry(client, battle);
                    setBattleData(client, M.from, battle);

                    await client.sendMessage(M.from, {
                        text:
                            `🔥 *ASHEN SANCTUM* 🔥\n\n` +
                            `💥 The *${ordinal} guardian* is down!\n\n` +
                            `Type *${client.prefix}battle continue* for the next guardian to appear, or *${client.prefix}ashen quit* to quit.`
                    });
                    return null;
                }

                battle.player2.activePokemon = alivePokemon[0];
                battle.player2.move = pickWildMove(battle);
                battle.turn = 'player1';
                setBattleData(client, M.from, battle);
                return handleBattles(client, M);
            }

            await client.sendMessage(M.from, {
                text: `${formatBattleTrainer(opponent.user)}, send out a Pokemon from your party by selecting from the list sent.`,
                mentions: [opponent.user]
            });

            battle.turn = battle.turn === 'player1' ? 'player2' : 'player1';
            setBattleData(client, M.from, battle);

            const originalSender = M.sender;
            M.sender = opponent.user;
            await handlePokemonSelection(client, M);
            M.sender = originalSender;
            return;
        }

        // In wild/dungeon battles, we only let the AI act in response to the player's action
        // (fight/switch/pokeball). Avoid auto-turning here to prevent "my Pokemon moved by itself".

        await client.sendMessage(M.from, {
            text: buildBattleOptionsText(client, battle, currentUser),
            mentions: isWildUser(currentUser.user) ? [] : [currentUser.user],
            image,
            jpegThumbnail: image.toString('base64')
        });
    } catch (error) {
        console.error('Error in continueSelection:', error);
    }
};

const endBattle = async (client, M, winner, loser) => {
    try {
        const battle = client.pokemonBattleResponse.get(M.from);
        if (!battle) return;

        const player1Party = await getPartyForUser(client, battle.player1.user);
        const player2Party = await getPartyForUser(client, battle.player2.user);

        const image = await client.utils.drawPokemonBattle({
            player1: { activePokemon: battle.player1.activePokemon, party: player1Party },
            player2: { activePokemon: battle.player2.activePokemon, party: player2Party }
        });

        await client.sendMessage(M.from, {
            image,
            jpegThumbnail: image.toString('base64')
        });

        await delay(3000);

        await client.sendMessage(M.from, {
            text: isWildUser(loser)
                ? `The wild *${client.utils.capitalize(battle.player2.activePokemon.name)}* ran out of Pokemon for battle.`
                : `*@${loser.split('@')[0]}* ran out of Pokemon for battle.`,
            mentions: isWildUser(loser) ? [] : [loser]
        });

        setTimeout(async () => {
            if (battle.mode === 'wild') {
                await cleanupWildBattle(client, battle);
                client.pokemonBattleResponse.delete(M.from);
                client.pokemonBattlePlayerMap.delete(winner);

                if (battle.isDungeon) {
                    const diffScale = { easy: 0.5, normal: 1, hard: 2, boss: 4 }[battle.dungeonDifficulty] || 1;
                    const rewardGems = Math.round(500000 * diffScale);
                    const rewardBalls = Math.round(10 * diffScale);

                    const econ = await client.getEcon(winner, { createIfMissing: true });
                    econ.gem = Math.round(Number(econ.gem || 0)) + rewardGems;
                    await econ.save().catch(() => null);

                    const winnerKey = (await client.resolveNumber(winner)) || client.getUserNumber(winner) || winner;
                    await addInventoryQuantity(client, winnerKey, 'master_ball', rewardBalls);

                    // Track ashen sanctum wins
                    const prevWins = Number((await client.DB.get(`ashen-wins-${winner}`)) || 0);
                    await client.DB.set(`ashen-wins-${winner}`, prevWins + 1).catch(() => null);

                    // Huge XP reward: apply once to the active Pokemon to avoid spamming.
                    try {
                        const party = await getPartyForUser(client, winner);
                        const active = battle.player1?.user === winner ? battle.player1.activePokemon : battle.player2.activePokemon;
                        if (active && active.hp > 0 && active.level < 100) {
                            await handleStats(client, M, Math.round(5000000 * diffScale), winner, active, 'player1');
                        }
                        // keep party saved via handleStats' updateActivePokemonInParty
                    } catch (_) {
                        // ignore XP reward errors
                    }

                    // Chance to receive a special-form Pokemon.
                    let bonusText = '';
                    try {
                        const roll = Math.random();
                        if (roll < 0.2) {
                            const choice = [
                                'deoxys-attack',
                                'deoxys-speed',
                                'deoxys-defense',
                                'groudon-primal',
                                'kyogre-primal',
                                'necrozma-dusk',
                                'necrozma-dawn',
                                'necrozma-ultra'
                            ][Math.floor(Math.random() * 8)];

                            const resp = await axios.get(`https://pokeapi.co/api/v2/pokemon/${choice}`);
                            const pdata = resp.data;
                            const level = 50;
                            const { hp, attack, defense, speed } = await client.utils.getPokemonStats(pdata.id, level);
                            const { moves, rejectedMoves } = await client.utils.assignPokemonMoves(pdata.name, level);
                            const tier = (await client.utils.getPokemonTier?.(pdata.name)) || 'normal';
                            const rewardPokemon = {
                                name: pdata.name,
                                level,
                                exp: client.utils.getExpByLevel(level, tier),
                                image:
                                    pdata.sprites?.other?.['official-artwork']?.front_default ||
                                    pdata.sprites?.front_default ||
                                    '',
                                id: pdata.id,
                                displayExp: 0,
                                tier,
                                hp,
                                attack,
                                defense,
                                speed,
                                maxHp: hp,
                                maxDefense: defense,
                                maxAttack: attack,
                                maxSpeed: speed,
                                types: pdata.types.map((t) => t.type.name),
                                moves,
                                rejectedMoves,
                                state: { status: '', movesUsed: 0 },
                                female: false,
                                tag: client.utils.generateRandomUniqueTag(10)
                            };

                            const party = await getPartyForUser(client, winner);
                            const pc = client.getPc ? await client.getPc(winner) : (await client.poke.get(`${winner}_PSS`)) || [];
                            if (party.length >= 6) pc.push(rewardPokemon);
                            else party.push(rewardPokemon);
                            await savePartyForUser(client, winner, party);
                            if (client.setPc) await client.setPc(winner, pc);
                            else await client.poke.set(`${winner}_PSS`, pc);

                            bonusText = `\n\n🎁 Bonus reward: *${client.utils.capitalize(rewardPokemon.name)}* joined your ${party.length >= 6 ? 'PC' : 'party'}!`;
                        }
                    } catch (_) {
                        // ignore reward pokemon errors
                    }

                    const diffLabel = battle.dungeonDifficulty
                        ? ` (${String(battle.dungeonDifficulty).toUpperCase()} CHALLENGE)`
                        : '';
                    return client.sendMessage(M.from, {
                        text:
                            `🔥 *ASHEN SANCTUM CLEARED!*${diffLabel} 🔥\n\n` +
                            `🎉 *@${winner.split('@')[0]}* defeated all sanctum guardians.\n\n` +
                            `Rewards:\n- *${rewardGems.toLocaleString()}* gems\n- *${rewardBalls}* Master Balls${bonusText}`,
                        mentions: [winner]
                    });
                }

                // Make sure any lingering wild spawn in this chat is cleared so others
                // can use spawnpokemon / catch right away.
                try { await client.pokemonResponse.delete(M.from); } catch (_) {}
                return client.sendMessage(M.from, {
                    text: `🎉 ${formatBattleTrainer(winner)} defeated the wild *${client.utils.capitalize((battle.wildPokemon || battle.player2.activePokemon).name)}*, and it fled the battlefield.`,
                    mentions: [winner]
                });
            }

            const updateEconomy = async (userId, change) => {
                const economy = await client.getEcon(userId);
                let wallet = economy ? (economy.gem || 0) : 0;
                wallet += change;

                if (economy) {
                    economy.gem = wallet;
                    await economy.save();
                } else if (change !== 0) {
                    await client.econ.create({ userId: client.getUserNumber(userId) || userId, gem: wallet });
                }

                return wallet;
            };

            const winnerWallet = await updateEconomy(winner, 0);
            const amount = winnerWallet > 5000 ? 4500 : winnerWallet >= 250 ? 250 : winnerWallet;
            const gold = Math.floor(Math.random() * amount);

            await updateEconomy(winner, gold);
            await updateEconomy(loser, -gold);

            client.pokemonBattleResponse.delete(M.from);
            client.pokemonBattlePlayerMap.delete(loser);
            client.pokemonBattlePlayerMap.delete(winner);

            await client.sendMessage(M.from, {
                text: `🎉 Congrats! *@${winner.split('@')[0]}*, you won this battle and received *${gold}* gems from *@${loser.split('@')[0]}* as they ran out of Pokemon for battle.`,
                mentions: [winner, loser]
            });
        }, 5000);
    } catch (error) {
        console.error('Error in endBattle:', error);
    }
};

const handleStats = async (client, M, exp, user, pokemon, player) => {
    try {
        const tier = pokemon.tier || (await client.utils.getPokemonTier?.(pokemon.name)) || 'normal';
        pokemon.tier = tier;
        if (!Number.isFinite(pokemon.exp)) pokemon.exp = 0;
        if (!Number.isFinite(pokemon.displayExp)) pokemon.displayExp = 0;
        const expValue = Number.isFinite(exp) ? exp : 0;
        const gainMultiplier = client.utils.getTierXpGainMultiplier
            ? client.utils.getTierXpGainMultiplier(tier)
            : 1;
        const resultExp = Math.max(1, Math.round((expValue / 50) * gainMultiplier));

        await client.sendMessage(M.from, {
            text: `${formatBattleActor(client, user, pokemon.name)} gained *${resultExp} XP*`,
            mentions: isWildUser(user) ? [] : [user]
        });
        await delay(3000);

        pokemon.exp += resultExp;
        pokemon.displayExp += resultExp;

        const computedLevel = client.utils.getLevelByExp(pokemon.exp, tier);
        const nextLevel = Math.max(pokemon.level, computedLevel);
        if (pokemon.level < nextLevel) {
            pokemon.level = nextLevel;
            pokemon.displayExp = pokemon.exp - client.utils.getExpByLevel(nextLevel, tier);
            await client.utils.handlePokemonStats(client, M, pokemon, true, player, user);
        }

        const battle = client.pokemonBattleResponse.get(M.from);
        if (battle && battle[player].activePokemon.tag === pokemon.tag) {
            battle[player].activePokemon = pokemon;
            setBattleData(client, M.from, battle);
        }

        await updateActivePokemonInParty(client, user, pokemon);
    } catch (error) {
        console.error('Error in handleStats:', error);
    }
};
