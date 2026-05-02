const { POKEBALLS } = require('./pokeballs');
const { POTIONS }   = require('./potions');

const MART_ITEMS = [
    ...POKEBALLS.map((item) => ({ ...item, type: 'pokeball' })),
    ...POTIONS.map((item)   => ({ ...item, type: 'potion'   }))
];

const getMartItemById = (id) => MART_ITEMS.find((item) => item.id === Number(id));

module.exports = {
    MART_ITEMS,
    getMartItemById
};
