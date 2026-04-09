// Shop Command
const itemsForSale = [
    { name: 'luckpotion', price: 15000, usage: 'Increases luck in slotting' },
    { name: 'pepperspray', price: 10000, usage: 'Self-defense against robbers' },
    { name: 'pokeball', price: 12000, usage: 'For catching wild Pokemons' }
];

module.exports = {
    name: 'shop',
    aliases: ['store'],
    category: 'economy',
    exp: 10,
    cool: 4,
    react: '🛒',
    usage: 'Use :shop',
    description: 'View items available for purchase',
    async execute(client, arg, M) {
        let text = '*┏─═─━══─| ꜱʜᴏᴘ |─══━─═─∘⦿ꕹ᛫*';
        text += '\n';
        itemsForSale.forEach((item, index) => {
            text += `*╏${index + 1} ] ɴᴀᴍᴇ:* ${item.name}\n*╏💰 ᴘʀɪᴄᴇ:* ${item.price}\n*╏🎴 ᴜꜱᴀɢᴇ:* ${item.usage}\n`;
        });
        text += `\n*┏─═─━══─| ᴇꭗᴀᴍᴘʟᴇ |─══━─═─∘⦿ꕹ᛫*`;
        text += `\n*╏🎴 ᴜꜱᴇ ${client.prefix}buy <item_name> <item_quantity>*`;
        text += `\n*╏📗 ᴇꭗᴀᴍᴘʟᴇ: ${client.prefix}buy luckpotion 2*`;
        text += `\n*┗─═─━══─| ꜱʜᴏᴘ |─══━─═─∘⦿ꕹ᛫*`;
        await M.reply(text);
     },
};
