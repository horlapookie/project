const { POKEBALLS } = require('./pokeballs');
const { POTIONS }   = require('./potions');
const { MEGA_STONES } = require('./megaItems');

// GMax Ball removed — GMax Pokémon evolve naturally, no stone needed
const MART_ITEMS = [
    ...POKEBALLS.map((item) => ({ ...item, type: 'pokeball'  })),
    ...POTIONS.map((item)   => ({ ...item, type: 'potion'    })),
    ...MEGA_STONES.map((s)  => ({ id: s.id, key: s.key, name: s.name, price: s.price, emoji: s.emoji, note: s.note, pokemon: s.pokemon, profile: s.profile, type: 'megastone' })),
];

const getMartItemById = (id) => MART_ITEMS.find((item) => item.id === Number(id));

module.exports = {
    MART_ITEMS,
    getMartItemById
};
