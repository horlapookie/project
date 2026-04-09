const TD = require('better-tord');
const {
    proto,
    generateWAMessageFromContent,
    prepareWAMessageMedia
} = require('@whiskeysockets/baileys');
module.exports = {
    name: 'shinjitsu',
    aliases: ['td'],
    category: 'fun',
    exp: 9,
    cool: 4,
    react: "🎯",
    usage: 'Use: Shinjitsu for truth or dare',
    description: 'Gives you truth or dare.',
    async execute(client, arg, M) {
        const sendMessage = async (client) => {
            const imageMessage = await prepareWAMessageMedia({ image: { url: "https://telegra.ph/file/d1eaee5deb630cb4f20f0.jpg" } }, { upload: client.waUploadToServer });
            const msg = generateWAMessageFromContent(M.from, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                            body: proto.Message.InteractiveMessage.Body.create({
                                text: '*Choose From The Below Button!*'
                            }),
                            footer: proto.Message.InteractiveMessage.Footer.create({
                                text: "𒉢 ꜱᴀʏ.ꜱᴄ֟፝ᴏᴛᴄʜ ⚡𐇻"
                            }),
                            header: proto.Message.InteractiveMessage.Header.create({
                                ...imageMessage,
                                title: "",
                                subtitle: "",
                                hasMediaAttachment: false
                            }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                buttons: [
                                    {
                                        name: "quick_reply",
                                        buttonParamsJson: "{\"display_text\":\"Next One 📜🔍\",\"id\":\"-td\"}"
                                    },
                                    {
                                        name: "quick_reply",
                                        buttonParamsJson: "{\"display_text\":\"Truth 🧧🎯\",\"id\":\"-td truth\"}"
                                    },
                                    {
                                        name: "quick_reply",
                                        buttonParamsJson: "{\"display_text\":\"Dare 🧧🎯\",\"id\":\"-td dare\"}"
                                    }
                                ]
                            })
                        })
                    }
                }
            }, {});
            await client.relayMessage(M.from, msg.message, { messageId: msg.key.id });
        }
        if (!arg) {
            await sendMessage(client);
            return;
        }

        const availableOptions = ['truth', 'dare'];
        const option = arg.trim().toLowerCase();

        if (!availableOptions.includes(option)) {
            M.reply('Invalid option. Please choose either "truth" or "dare".');
            return;
        }
        try {
            const result = option === 'truth' ? await TD.get_truth() : await TD.get_dare();
            M.reply(`*𒂟 Here's Your ${option} :*\n> ${result}`);
        } catch (error) {
            console.error('Error fetching truth or dare:', error);
            M.reply('Sorry, I couldn\'t fetch a truth or dare at the moment. Please try again later.');
        }
    }
};
