const axios = require('axios')
const { PokemonClient } = require('pokenode-ts')
const {
    renderPartyOverviewCard,
    renderPokemonDetailCard,
    renderPokemonMovesCard
} = require('../../lib/CardRenderer')

module.exports = {
    name: "party",
    aliases: ["party"],
    exp: 5,
    cool: 5,
    react: "🟩",
    category: "pokemon",
    usage: 'Use :party',
    description: "View your caught Pokémon in your party",
    async execute(client, arg, M) {
        try {
            let party = await client.poke.get(`${M.sender}_Party`) || [];
            const companion = await client.poke.get(`${M.sender}_Companion`)
            if (party.length === 0 && companion) {
                const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${companion}`)
                const { hp, attack, defense, speed } = await client.utils.getPokemonStats(data.id, 5)
                const moves = await client.utils.getStarterPokemonMoves(data.name)
                const server = new PokemonClient()
                const { gender_rate } = await server.getPokemonSpeciesByName(data.name)
                let female = false
                const genders = ['female', 'male']
                if (gender_rate >= 8) female = true
                if (gender_rate < 8 && gender_rate > 0) {
                    female = genders[Math.floor(Math.random() * genders.length)] === 'female'
                }

                party = [
                    {
                        name: data.name,
                        level: 5,
                        exp: client.utils.getExpByLevel(5),
                        image: data.sprites.other['official-artwork'].front_default,
                        id: data.id,
                        displayExp: 0,
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
                        rejectedMoves: [],
                        state: { status: '', movesUsed: 0 },
                        female,
                        tag: '0'
                    }
                ]
                await client.poke.set(`${M.sender}_Party`, party)
            }
            if (party.length === 0) {
                return M.reply("📭 Your Pokémon party is empty!");
            }

            if (arg) {
                const index = parseInt(arg);
                if (isNaN(index) || index <= 0 || index > party.length) {
                    return M.reply("Invalid index. Please provide a valid index within your party range.");
                }
                const pokemon = party[index - 1];
                const k = pokemon.level + 1;
                const required = await client.utils.getExpByLevel(k);
                const detailCard = await renderPokemonDetailCard({
                    pokemon: {
                        ...pokemon,
                        name: client.utils.capitalize(pokemon.name),
                        types: pokemon.types.map(client.utils.capitalize),
                        state: {
                            status:
                                pokemon.hp <= 0
                                    ? 'Fainted'
                                    : pokemon.state.status === ''
                                    ? 'Fine'
                                    : client.utils.capitalize(pokemon.state.status)
                        },
                        moves: pokemon.moves.map((move) => ({
                            ...move,
                            name: move.name.split('-').map(client.utils.capitalize).join(' '),
                            type: client.utils.capitalize(move.type)
                        }))
                    },
                    requiredXp: required
                })

                await client.sendMessage(M.from, {
                    image: detailCard,
                    mimetype: 'image/png',
                    caption: `*${client.utils.capitalize(pokemon.name)}* details\n\nUse *${client.prefix}party ${index} --moves* to view move details.`
                });

                if (arg.includes('--moves')) {
                    const movesCard = await renderPokemonMovesCard({
                        pokemon: {
                            name: client.utils.capitalize(pokemon.name),
                            moves: pokemon.moves.map((move) => ({
                                ...move,
                                name: move.name.split('-').map(client.utils.capitalize).join(' '),
                                type: client.utils.capitalize(move.type)
                            }))
                        }
                    })
                    await client.sendMessage(M.from, { image: movesCard, mimetype: 'image/png' }, { quoted: M });
                }
            } else {
                const overviewCard = await renderPartyOverviewCard({
                    trainerName: M.pushName || M.sender.split('@')[0],
                    prefix: client.prefix,
                    party: party.map((pokemon) => ({
                        ...pokemon,
                        name: client.utils.capitalize(pokemon.name),
                        types: pokemon.types.map(client.utils.capitalize)
                    }))
                })

                await client.sendMessage(
                    M.from,
                    {
                        image: overviewCard,
                        mimetype: 'image/png',
                        caption: `Your current party lineup.\n\nUse *${client.prefix}party <index_number>* to inspect one Pokemon.`
                    },
                    { quoted: M }
                );
            }
        } catch (err) {
            console.error(err);
            await client.sendMessage(M.from, {
                text: "An error occurred while retrieving your Pokémon party."
            });
        }
    },
};
