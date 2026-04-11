const axios = require('axios');

module.exports = {
    name: "pokemon",
    aliases: ["pokemon"],
    category: "pokemon",
    description: "Get details of a Pokémon by providing its name or National Pokédex number.",
    async execute(client, arg, M) {
        try {
            const parts = String(arg || '').trim().split(/\s+/).filter(Boolean)
            if (!parts.length) {
                return M.reply("Please provide a Pokémon name or National Pokédex number.")
            }

            const priceFlag = parts.find((p) => p.toLowerCase().startsWith('--price='))
            const priceMode = priceFlag ? priceFlag.split('=')[1].toLowerCase() : null

            // The pokemon term is the first non-flag token; allow users to type "-Mewtwo".
            const rawTerm = parts.find((p) => !p.startsWith('--')) || parts[0]
            const cleaned = rawTerm.replace(/^-+/, '').toLowerCase()
            // common misspellings
            const term =
                cleaned === 'miradon' ? 'miraidon' :
                cleaned === 'koridon' ? 'koraidon' :
                cleaned

            const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${term}`);
            const res = response.data;

            // extra classification (legendary/mythical) via species endpoint
            let isLegendary = false
            let isMythical = false
            try {
                const speciesResp = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${res.species?.name || res.name}`)
                isLegendary = Boolean(speciesResp.data?.is_legendary)
                isMythical = Boolean(speciesResp.data?.is_mythical)
            } catch (_) {}

            const party = await client.poke.get(`${M.sender}_Party`) || [];
            const pc = await client.poke.get(`${M.sender}_Pss`) || [];
            const pokemons = [...pc, ...party];
            const ownedAtParty = party.flatMap((x, y) => (x.name === res.name ? y : []));
            const ownedAtPc = pc.flatMap((x, y) => (x.name === res.name ? y : []));
            const owned = pokemons.filter((pokemon) => pokemon.name === res.name);

            const classText = isMythical ? 'Mythical' : isLegendary ? 'Legendary' : 'Normal'

            const textLines = [
                `🎈 *Name:* ${client.utils.capitalize(res.name)}`,
                `🧧 *Pokedex ID:* ${res.id}`,
                `🏷️ *Class:* ${classText}`,
                `🎗 *${res.types.length > 1 ? 'Types' : 'Type'}:* ${res.types.map((type) => `${client.utils.capitalize(type.type.name)}`).join(', ')}`,
                `🎏 *${res.abilities.length > 1 ? 'Abilities' : 'Ability'}:* ${res.abilities.map((ability) => `${client.utils.capitalize(ability.ability.name)}`).join(', ')}`,
                '',
                `🎐 *Owned:* ${owned.length}`,
                `⚗ *Party:* ${ownedAtParty.length < 1 ? 'None' : ownedAtParty.map((x) => x + 1).join(', ')}`,
                `💻 *Pc:* ${ownedAtPc.length < 1 ? 'None' : ownedAtPc.map((index) => index + 1).join(', ')}`
            ]

            // Pricing
            if (priceMode === 'fresh' || priceMode === 'max') {
                const isMega = /-mega(-x|-y)?$/.test(res.name)
                const base =
                    isMythical ? 250000 :
                    isLegendary ? 200000 :
                    isMega ? 180000 :
                    50000
                const price = priceMode === 'max' ? Math.round(base * 2.25) : base
                textLines.push('', `💰 *Price (${priceMode}):* ${price} gems`)
            }

            const text = textLines.join('\n')

            const imageBuffer = await client.utils.getBuffer(res.sprites.other['official-artwork'].front_default);

            await client.sendMessage(M.from, {
                image: imageBuffer,
                caption: text
            });
        } catch (err) {
            console.error(err);
            await M.reply("An error occurred while fetching the Pokémon details.");
        }
    }
};
