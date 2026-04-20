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
            const targetUser = M.mentions?.[0] || M.quoted?.participant || M.sender;
            const economy = targetUser !== M.sender
                ? (await client.getEcon(targetUser))
                : (await client.getEcon(M));

            const party = (await client.poke.get(`${targetUser}_Party`)) || [];
            const pss = (await client.poke.get(`${targetUser}_PSS`)) || [];
            const deck = (await client.DB.get(`${targetUser}_Deck`)) || [];
            const collection = (await client.DB.get(`${targetUser}_Collection`)) || [];

            const userKey = String(targetUser).replace(/\D/g, '') || targetUser;
            const pokeballItems = await getInventory(client, userKey);
            const totalPokeballs = pokeballItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

            const ashenWins = Number((await client.DB.get(`ashen-wins-${targetUser}`)) || 0);

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

            let text = '*┏─═─━══─| ɪɴᴠᴇɴᴛᴏʀʏ |─══━─═─∘⦿ꕹ᛫*\n';
            text += `*╏🌶️ ᴘᴇᴘᴘᴇʀ ꜱᴘʀᴀʏ:* ${pepper}\n`;
            text += `*╏🍀 ʟᴜᴄᴋ ᴘᴏᴛɪᴏɴ:* ${luck}\n`;
            text += `*╏💎 ᴡᴀʟʟᴇᴛ:* ${wallet.toLocaleString()} gems\n`;
            text += `*╏🏦 ᴛʀᴇᴀꜱᴜʀʏ:* ${bank.toLocaleString()} gems\n`;
            text += `*╏💰 ᴛᴏᴛᴀʟ ɢᴇᴍꜱ:* ${totalGems.toLocaleString()}\n`;
            text += `*╏🧿 ᴘᴏᴋᴇᴍᴏɴ:* ${party.length} (party) / ${pss.length} (pc)\n`;
            text += `*╏🃏 ᴄᴀʀᴅꜱ:* ${deck.length} (deck) / ${collection.length} (collection)\n`;
            text += `*╏🔥 ᴀꜱʜᴇɴ ᴡɪɴꜱ:* ${ashenWins}\n`;
            text += `*╏🎯 ᴘᴏᴋᴇʙᴀʟʟꜱ (${totalPokeballs} total):*\n`;

            for (const ball of pokeballItems) {
                if (ball.quantity > 0) {
                    text += `*╏   • ${ball.name}:* ${ball.quantity}\n`;
                }
            }
            if (totalPokeballs === 0) {
                text += `*╏   None — visit the mart to buy some!\n`;
            }

            text += `*┗─═─━══─| ɪɴᴠᴇɴᴛᴏʀʏ |─══━─═─∘⦿ꕹ᛫*\n`;

            await client.sendMessage(
                M.from,
                {
                    image: { url: "https://i.ibb.co/gdXngnq/Picsart-24-05-21-16-58-34-307.jpg" },
                    caption: text,
                    mentions: targetUser !== M.sender ? [targetUser] : []
                }
            );

        } catch (err) {
            console.error(err);
            M.reply("An error occurred while fetching your inventory.");
        }
    }
};
