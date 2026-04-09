const { POKEBALLS } = require('./pokeballs');

const GENERAL_MART_ITEMS = [
    {
        id: 1,
        key: 'luckPotion',
        name: 'Luck Potion',
        description: 'Increases luck in slotting.',
        price: 15000,
        type: 'economy'
    },
    {
        id: 6,
        key: 'pepperSpray',
        name: 'Pepper Spray',
        description: 'Self-defense against robbers.',
        price: 10000,
        type: 'economy'
    }
];

const MART_ITEMS = [
    GENERAL_MART_ITEMS[0],
    ...POKEBALLS.map((item) => ({ ...item, type: 'pokeball' })),
    GENERAL_MART_ITEMS[1]
];

const getMartItemById = (id) => MART_ITEMS.find((item) => item.id === Number(id));

module.exports = {
    GENERAL_MART_ITEMS,
    MART_ITEMS,
    getMartItemById
};
