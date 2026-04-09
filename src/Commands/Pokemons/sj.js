const axios = require('axios');
const { PokemonClient } = require('pokenode-ts');

module.exports = {
    name: "start-journey",
    aliases: ["start-journey"],
    category: "pokemon",
    description: "Start your Pokémon journey by choosing a starter Pokémon.",
    async execute(client, arg, M) {
        try {
            const companion = await client.poke.get(`${M.sender}_Companion`);

            if (companion) {
                return M.reply(`You have already started your journey with ${companion}.`);
            }

            const regions = {
                kanto: [1, 4, 7],
                johto: [152, 155, 158],
                hoenn: [252, 255, 258],
                sinnoh: [387, 390, 393],
                unova: [495, 498, 501],
                kalos: [650, 653, 656],
                alola: [722, 725, 728],
                galar: [810, 813, 816]
            };

            if (!arg) {
                let text = "🌟 *Choose a companion from the list below to start your journey:* 🌟\n\n";
                for (const region in regions) {
                    text += `🌍 *${client.utils.capitalize(region)} Region*:\n`;
                    const starterPokemons = regions[region];
                    for (const pkmn of starterPokemons) {
                        const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pkmn}`);
                        const { name, id, types } = data;
                        text += `🔹 *Name:* ${client.utils.capitalize(name)}\n🔸 *ID:* ${id}\n🔹 *Type(s):* ${types.map(type => client.utils.capitalize(type.type.name)).join(', ')}\n📜 *Use:* :start-journey --${name}\n\n`;
                    }
                }
                await M.reply(text);
            } else if (arg.includes('--') && !arg.includes('--choose')) {
                const pokemonName = arg.split('--')[1].trim();
                const { data: res } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
                
                let text = `🎈 *Name:* ${client.utils.capitalize(res.name)}\n\n🧧 *Pokedex ID:* ${res.id}\n\n🎗 *${res.types.length > 1 ? 'Types' : 'Type'}:* ${res.types.map((type) => `${client.utils.capitalize(type.type.name)}`).join(', ')}\n\n🎏 *${res.abilities.length > 1 ? 'Abilities' : 'Ability'}:* ${res.abilities.map((ability) => `${client.utils.capitalize(ability.ability.name)}`).join(', ')}`;

                const server = new PokemonClient();
                const info = await server.getPokemonSpeciesByName(res.name);
                
                if (info.form_descriptions && info.form_descriptions.length > 0) {
                    text += `\n\n♻ *Description:* ${info.form_descriptions[0].description}`;
                }
                
                text += `\n\n🗒️ *Instructions:* Use :start-journey --${res.name} --choose to start your journey with this Pokémon.`;
                
                const image = await client.utils.getBuffer(res.sprites.other['official-artwork'].front_default);
                
                await client.sendMessage(M.from, {
                    image: image,
                    caption: text
                });
            }

            if (arg.includes('--choose')) {
                const pokemonName = arg.split('--')[1].trim().toLowerCase();
                const starterPokemons = Object.values(regions).flat();

                const { data: pokemonData } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);

                if (!starterPokemons.includes(pokemonData.id)) {
                    return M.reply("❌ You can only choose a Pokémon from the starters list. Please choose a valid starter Pokémon.");
                }

                await client.poke.set(`${M.sender}_Companion`, pokemonName);

                const data = pokemonData;
                const image = data.sprites.other['official-artwork'].front_default;
                const { hp, attack, defense, speed } = await client.utils.getPokemonStats(data.id, 5);
                const moves = await client.utils.getStarterPokemonMoves(data.name);
                const server = new PokemonClient();
                const { gender_rate } = await server.getPokemonSpeciesByName(data.name);

                let female = false;
                if (gender_rate >= 8) female = true;
                const genders = ['female', 'male'];
                if (gender_rate < 8 && gender_rate > 0) {
                    female = genders[Math.floor(Math.random() * genders.length)] === 'female';
                }
                
                // Fetch experience from the level API
                const { data: pokemonLevelCharts } = await axios.get('https://aurora-api.vercel.app/poke/level');
                const expArr = pokemonLevelCharts.filter((x) => x.level <= 5);
                const { expRequired: exp } = expArr[expArr.length - 1];

                const party = await client.poke.get(`${M.sender}_Party`) || [];

                party.push({
                    name: data.name,
                    level: 5,
                    exp: exp, // Set experience based on level
                    image,
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
                    state: {
                        status: '',
                        movesUsed: 0
                    },
                    female,
                    tag: '0'
                });

                await client.poke.set(`${M.sender}_Party`, party);

                return M.reply(
                    `🎉 *Congrats!* You have just started your journey as a Pokémon trainer with your companion *${client.utils.capitalize(
                        pokemonName
                    )}*!`
                );
            }
        } catch (err) {
            console.error(err);
            await M.reply("An error occurred while starting your Pokémon journey.");
        }
    },
};
