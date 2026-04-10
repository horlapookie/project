const { POKEBALLS } = require('./pokeballs');

const MART_ITEMS = [
    ...POKEBALLS.map((item) => ({ ...item, type: 'pokeball' }))
];

const getMartItemById = (id) => MART_ITEMS.find((item) => item.id === Number(id));

module.exports = {
    MART_ITEMS,
    getMartItemById
};
