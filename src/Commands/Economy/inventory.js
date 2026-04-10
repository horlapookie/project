// Inventory Command
const { getInventory } = require('../../Helpers/pokeballs');

module.exports = {
    name: 'inventory',
    aliases: ['inv'],
    category: 'economy',
    exp: 7,
    cool: 4,
    react: "🧭",
    usage: 'Use :inv',
    description: 'Gives you details about your inventory',
    async execute(client, arg, M) {
        try {
            const economy = await client.getEcon(M);
            const party = (await client.poke.get(`${M.sender}_Party`)) || [];
            const pss = (await client.poke.get(`${M.sender}_PSS`)) || [];
            const deck = (await client.DB.get(`${M.sender}_Deck`)) || [];
            const collection = (await client.DB.get(`${M.sender}_Collection`)) || [];
            const pokeballs = (await getInventory(client, M.sender)).reduce((sum, item) => sum + (item.quantity || 0), 0);

            let pepper = 0;
            let luck = 0;
            let wallet = 0;
            let bank = 0;

            if (economy) {
                pepper = economy.pepperSpray || 0;
                luck = economy.luckPotion || 0;
                wallet = economy.gem || 0;
                bank = economy.treasury || 0;
            }

            const totalGems = wallet + bank;
            const totalTreasuryValue = bank;

            let text = '*┏─═─━══─| ɪɴᴠᴇɴᴛᴏʀʏ |─══━─═─∘⦿ꕹ᛫*\n';
            text += `*╏🌶️ ᴘᴇᴘᴘᴇʀ ꜱᴘʀᴀʏ:* ${pepper}\n`;
            text += `*╏🍀 ʟᴜᴄᴋ ᴘᴏᴛɪᴏɴ:* ${luck}\n`;
            text += `*╏🪩 ᴘᴏᴋᴇʙᴀʟʟꜱ:* ${pokeballs}\n`;
            text += `*╏💎 ᴛᴏᴛᴀʟ ɢᴇᴍꜱ:* ${totalGems}\n`;
            text += `*╏💰 ᴛᴏᴛᴀʟ ᴛʀᴇᴀꜱᴜʀʏ:* ${totalTreasuryValue}\n`;
            text += `*╏🧿 ᴘᴏᴋᴇᴍᴏɴ:* ${party.length} (party) / ${pss.length} (pc)\n`;
            text += `*╏🃏 ᴄᴀʀᴅꜱ:* ${deck.length} (deck) / ${collection.length} (collection)\n`;
            text += `*┗─═─━══─| ɪɴᴠᴇɴᴛᴏʀʏ |─══━─═─∘⦿ꕹ᛫*\n`;
            
            await client.sendMessage(
            M.from,
            {
                image: { url: "https://i.ibb.co/gdXngnq/Picsart-24-05-21-16-58-34-307.jpg" },
                caption: text
            },
        );
        
        } catch (err) {
            console.error(err);
            M.reply("An error occurred while fetching your inventory.");
        }
    }
};
