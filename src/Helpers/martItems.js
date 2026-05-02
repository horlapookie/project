const { POKEBALLS } = require('./pokeballs');
const { POTIONS }   = require('./potions');
const { MEGA_STONES, GMAX_BALL } = require('./megaItems');

const MART_ITEMS = [
    ...POKEBALLS.map((item) => ({ ...item, type: 'pokeball'  })),
    ...POTIONS.map((item)   => ({ ...item, type: 'potion'    })),
    ...MEGA_STONES.map((s)  => ({ id: s.id, key: s.key, name: s.name, price: s.price, emoji: s.emoji, note: s.note, pokemon: s.pokemon, profile: s.profile, type: 'megastone' })),
    { id: GMAX_BALL.id, key: GMAX_BALL.key, name: GMAX_BALL.name, price: GMAX_BALL.price, emoji: GMAX_BALL.emoji, note: GMAX_BALL.note, pokemon: GMAX_BALL.pokemon, profile: GMAX_BALL.profile, type: 'gmaxball' },
];

const getMartItemById = (id) => MART_ITEMS.find((item) => item.id === Number(id));

module.exports = {
    MART_ITEMS,
    getMartItemById
};
