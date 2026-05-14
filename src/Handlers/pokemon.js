const cron = require("node-cron");
const axios = require("axios");
const { PokemonClient } = require('pokenode-ts');

const spawnWildPokemon = async (client, jid, options = {}) => {
    const forcedName = String(options.forceName || '').trim().toLowerCase()
    const idOrName = forcedName || client.utils.getRandomInt(1, 898)
    let data;
    try {
        const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${idOrName}`);
        data = response.data;
    } catch (error) {
        if (forcedName) {
            throw new Error(`Invalid pokemon name: ${forcedName}`)
        }
        throw error
    }
    const level = Math.floor(Math.random() * (28 - 15 + 1)) + 15;

    const tier = (await client.utils.getPokemonTier?.(data.name)) || 'normal';
    const exp = client.utils.getExpByLevel(level, tier);
    const image =
        data.sprites?.other?.['official-artwork']?.front_default ||
        data.sprites?.front_default ||
        data.sprites?.other?.dream_world?.front_default ||
        '';
    const { hp, attack, defense, speed } = await client.utils.getPokemonStats(data.id, level);
    const { moves, rejectedMoves } = await client.utils.assignPokemonMoves(data.name, level);
    const server = new PokemonClient();
    const genders = ['female', 'male'];
    // Some forms (mega/primal/etc) do not exist under `pokemon-species/<form-name>`.
    const speciesName =
        data?.species?.name ||
        String(data?.name || '')
            .replace(/-mega(-x|-y)?$/i, '')
            .replace(/-primal$/i, '')
            .replace(/-(gmax|gigantamax)$/i, '')
            .trim();
    let gender_rate = 4;
    try {
        const species = await server.getPokemonSpeciesByName(speciesName);
        gender_rate = Number(species?.gender_rate ?? 4);
    } catch (_) {
        gender_rate = 4;
    }
    let female = false;
    if (gender_rate >= 8) female = true;
    if (gender_rate < 8 && gender_rate > 0) {
        female = genders[Math.floor(Math.random() * genders.length)] === 'female';
    }

    const { applyBaseBoost } = require('../Helpers/megaBoost');

    // Ensure spawned Pokémon are base forms only
    const baseName = String(data.name || '')
        .replace(/-mega(-x|-y)?$/i, '')
        .replace(/-primal$/i, '')
        .replace(/-(gmax|gigantamax)$/i, '')
        .trim();

    const wildPokemon = {
        spawnedBy: options.spawnedBy || null,
        catchLockedUntil: options.spawnedBy ? Date.now() + 60 * 1000 : 0,
        spawnedAt: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000,
        name: baseName,
        level,
        exp,
        image,
        id: data.id,
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
        types: data.types.map((type) => type.type.name),
        moves,
        rejectedMoves,
        state: {
            status: '',
            movesUsed: 0
        },
        female,
        tag: client.utils.generateRandomUniqueTag(10)
    }

    // Apply ×1.5 base boost to all non-mega/gmax wild Pokémon
    applyBaseBoost(wildPokemon);

    await client.pokemonResponse.set(jid, wildPokemon);

    const buffer = await client.utils.getBuffer(image);
    await client.sendMessage(jid, {
        image: buffer,
        caption: `🌟 A Wild Pokémon Appeared! 🌟\n🆔 ID: ${data.id}\n🔥 Types: ${data.types
            .map((type) => type.type.name)
            .join(', ')}\n🔹 Level: ${level}\n\n[Use *${client.prefix}catch* to challenge this Pokémon and try to catch it!]`
    });

    // If this spawn was triggered by a user, we keep the first 60s lock silent,
    // then announce that anyone can start the wild battle (only if still unclaimed).
    if (wildPokemon.spawnedBy && wildPokemon.catchLockedUntil) {
        setTimeout(async () => {
            try {
                const current = await client.pokemonResponse.get(jid);
                if (!current || current.tag !== wildPokemon.tag) return;
                if (client.pokemonBattleResponse.has(jid)) return;
                if (Date.now() < Number(current.catchLockedUntil || 0)) return;

                await client.sendMessage(jid, {
                    text: `The wild *${client.utils.capitalize(current.name)}* can now be challenged by anyone using *${client.prefix}catch*.`
                });
            } catch (_) {
                // ignore
            }
        }, 60 * 1000);
    }

    // Auto-expire the spawn if nobody starts a battle within 5 minutes.
    setTimeout(async () => {
        try {
            const current = await client.pokemonResponse.get(jid);
            if (!current || current.tag !== wildPokemon.tag) return;
            if (client.pokemonBattleResponse.has(jid)) return;
            if (Date.now() < (current.expiresAt || 0)) return;

            await client.pokemonResponse.delete(jid);
            await client.sendMessage(jid, {
                text: `The wild *${client.utils.capitalize(current.name)}* fled because nobody challenged it in time.`
            });
        } catch (_) {
            // ignore expiry errors
        }
    }, 5 * 60 * 1000);

    return wildPokemon
}

module.exports = PokeHandler = async (client, M) => {
    try {
        client.spawnWildPokemon = async (jid, options = {}) => await spawnWildPokemon(client, jid, options)
        let wilds = await client.DB.get('wild');
        const wild = wilds || [];

        for (let i = 0; i < wild.length; i++) {
            const jid = wild[i];

            if (wild.includes(jid)) {
                cron.schedule('*/5 * * * *', async () => {
                    try {
                        await spawnWildPokemon(client, jid)
                    } catch (err) {
                        console.log(err);
                        await client.sendMessage(jid, {
                            image: { url: `${client.utils.errorChan()}` },
                            caption: `${client.utils.greetings()} Error-Chan Dis\n\nCommand error:\n${err}`
                        });
                    }
                });
            }
        }
    } catch (error) {
        console.log(error);
    }
};
