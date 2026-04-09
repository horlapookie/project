// Inventory Command
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
            const userId = M.sender;
            const economy = await client.econ.findOne({ userId });

            let pepper = 0;
            let luck = 0;
            let pokeballs = 0;
            let wallet = 0;
            let bank = 0;

            if (economy) {
                pepper = economy.pepperSpray || 0;
                luck = economy.luckPotion || 0;
                pokeballs = economy.pokeball || 0;
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
