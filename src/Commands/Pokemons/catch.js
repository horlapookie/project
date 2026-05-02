
const { applyBaseBoost } = require('../../Helpers/megaBoost')
const { getMegaStoneByKey, GMAX_BALL } = require('../../Helpers/megaItems')

// Apply a temporary stone boost to a party in-place. Returns list of boosted Pokémon.
const applyTemporaryStoneBoosts = (party) => {
    const boosted = []
    for (const p of party) {
        if (!p.stoneEquipped || p._stonePreBoost) continue
        const profile = p.stoneEquipped === GMAX_BALL.key
            ? GMAX_BALL.profile
            : getMegaStoneByKey(p.stoneEquipped)?.profile
        if (!profile) continue
        p._stonePreBoost = {
            hp: p.hp, attack: p.attack, defense: p.defense, speed: p.speed,
            maxHp: p.maxHp, maxAttack: p.maxAttack, maxDefense: p.maxDefense, maxSpeed: p.maxSpeed
        }
        p.hp      = Math.floor((p.hp      || 0) * profile.hp)
        p.attack  = Math.floor((p.attack  || 0) * profile.atk)
        p.defense = Math.floor((p.defense || 0) * profile.def)
        if (p.speed      != null) p.speed      = Math.floor(p.speed      * profile.spd)
        if (p.maxHp      != null) p.maxHp      = Math.floor(p.maxHp      * profile.hp)
        if (p.maxAttack  != null) p.maxAttack  = Math.floor(p.maxAttack  * profile.atk)
        if (p.maxDefense != null) p.maxDefense = Math.floor(p.maxDefense * profile.def)
        if (p.maxSpeed   != null) p.maxSpeed   = Math.floor(p.maxSpeed   * profile.spd)
        boosted.push(p)
    }
    return boosted
}

module.exports = {
    name: "catch",
    aliases: ["catch"],
    exp: 5,
    cool: 4,
    react: "✅",
    usage: 'Use {prefix}catch',
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

            // Load party
            const party = (await client.poke.get(`${M.sender}_Party`)) || []

            // 1. Lazy base-boost migration for non-mega party members
            let partyDirty = false
            for (const p of party) {
                if (!p.baseStatsBoosted) {
                    applyBaseBoost(p)
                    if (p.baseStatsBoosted) partyDirty = true
                }
            }

            // 2. Apply temporary stone boost for any equipped Pokémon
            const stoneBoosted = applyTemporaryStoneBoosts(party)
            if (stoneBoosted.length) partyDirty = true

            if (partyDirty) await client.poke.set(`${M.sender}_Party`, party)

            const availableParty = party.filter((pokemon) => pokemon.hp > 0)
            if (!availableParty.length) {
                return M.reply("You don't have any Pokemon capable of battling right now.")
            }

            client.pokemonResponse.delete(M.from);

            // Announce stone boost activations
            if (stoneBoosted.length) {
                const lines = stoneBoosted.map(p =>
                    `⚡ *${client.utils.capitalize(p.name)}*\n` +
                    `   ❤️ HP: *${p.maxHp ?? p.hp}*  |  ⚡ ATK: *${p.attack}*\n` +
                    `   🛡 DEF: *${p.defense}*  |  💨 SPD: *${p.speed ?? '—'}*`
                )
                await client.sendMessage(M.from, {
                    text:
                        `🔥 *Mega Boost activated! Battle stats for @${M.sender.split('@')[0]}:*\n\n` +
                        lines.join('\n\n') +
                        `\n\n_(Stats revert after battle ends)_`,
                    mentions: [M.sender]
                })
            }

            const wildUser = `wild-${M.from.replace(/[^a-zA-Z0-9]/g, '')}@pokemon`;
            const wildParty = [{ ...data }];
            await client.poke.set(`${wildUser}_Party`, wildParty);

            const battleObj = {
                mode: 'wild',
                wildUser,
                wildPokemon: { ...data },
                wildRewardPending: true,
                expiryToken: `${Date.now()}-${Math.random()}`,
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
            }
            if (client.persistBattleSync) client.persistBattleSync(M.from, battleObj)
            else client.pokemonBattleResponse.set(M.from, battleObj)
            client.pokemonBattlePlayerMap.set(M.sender, M.from);

            const image = await client.utils.drawPokemonBattle({
                player1: { activePokemon: availableParty[0], party: availableParty },
                player2: { activePokemon: wildParty[0], party: wildParty }
            });

            await client.sendMessage(M.from, {
                image,
                caption: `🌀 *A wild battle started!* 🌀\n\n*@${M.sender.split('@')[0]}* sent out *${client.utils.capitalize(availableParty[0].name)}*.\n\nA wild *${client.utils.capitalize(data.name)}* appeared at Level *${data.level}*.\n\nUse one of the options below:\n\n- *${client.prefix}battle fight* to attack\n- *${client.prefix}battle switch* to switch Pokemon\n- *${client.prefix}battle pokeballs* to check your pokeballs\n- *${client.prefix}battle run* to run away`,
                mentions: [M.sender]
            });

            // Inactivity timeout is enforced centrally (10 minutes) and is persistent across restarts.

        } catch (err) {
            console.error(err);
            await client.sendMessage(M.from, {
                image: { url: `${client.utils.errorChan()}` },
                caption: `${client.utils.greetings()} Error-Chan Dis\n\nError:\n${err}`
            });
        }
    },
};
