const POKEBALLS = [
    {
        id: 2,
        key: 'master_ball',
        name: 'Master Ball',
        description: 'A type of pokeball which can be used to catch wild pokemon without fail (100% success rate).',
        price: 10000,
        successRate: 100
    },
    {
        id: 3,
        key: 'ultra_ball',
        name: 'Ultra Ball',
        description: 'A type of pokeball which can be used to catch wild pokemon. It has 62.4% success rate.',
        price: 7000,
        successRate: 62.4
    },
    {
        id: 4,
        key: 'great_ball',
        name: 'Great Ball',
        description: 'A type of pokeball which can be used to catch wild pokemon. It has 41% success rate.',
        price: 5000,
        successRate: 41
    },
    {
        id: 5,
        key: 'pokeball',
        name: 'Pokeball',
        description: 'A device which can be used to catch wild pokemon. It has 28% success rate.',
        price: 2000,
        successRate: 28
    }
];

const getWeekKey = (date = new Date()) => {
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
    return `${utcDate.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

const getBallById = (id) => POKEBALLS.find((ball) => ball.id === Number(id));

const getBagKey = (userId) => `${userId}_bag_pokeballs`;

const getInventory = async (client, userId) => {
    const bag = (await client.DB.get(getBagKey(userId))) || {};
    return POKEBALLS.map((ball) => ({
        ...ball,
        quantity: Number(bag[ball.key] || 0)
    }));
};

const setInventoryQuantity = async (client, userId, key, quantity) => {
    const bag = (await client.DB.get(getBagKey(userId))) || {};
    bag[key] = Math.max(0, Number(quantity || 0));
    await client.DB.set(getBagKey(userId), bag);
    return bag[key];
};

const addInventoryQuantity = async (client, userId, key, amount) => {
    const inventory = await getInventory(client, userId);
    const current = inventory.find((item) => item.key === key)?.quantity || 0;
    return setInventoryQuantity(client, userId, key, current + amount);
};

const getWeeklyPurchaseKey = (userId, ballId, weekKey = getWeekKey()) =>
    `${userId}_pokeball_weekly_${ballId}_${weekKey}`;

module.exports = {
    POKEBALLS,
    getWeekKey,
    getBallById,
    getInventory,
    setInventoryQuantity,
    addInventoryQuantity,
    getWeeklyPurchaseKey
};
