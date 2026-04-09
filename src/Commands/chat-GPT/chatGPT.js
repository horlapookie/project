const fetch = require('node-fetch'); // Ensure node-fetch is installed and required

module.exports = {
    name: 'chat-GPT',
    aliases: ['gpt','chatgpt'],
    category: 'chat-GPT',
    exp: 5,
    cool: 4,
    react: "⚡",
    usage: 'Use :ai <your text>',
    description: 'Fetches a response from the GPT-4 API',
    async execute(client, arg, M) {
        if (!arg) {
            return M.reply('Please provide some text to query the AI.');
        }

        try {
            const response = await fetch(`https://oni-chan-unique-api.vercel.app/gpt4?text=${encodeURIComponent(arg)}`);
            const data = await response.json();

            if (data && data.result) {
                await client.sendMessage(M.from, { text: data.result }, { quoted: M });
            } else {
                await client.sendMessage(M.from, { text: 'No response received from the AI.' }, { quoted: M });
            }
        } catch (error) {
            console.error('Error fetching AI response:', error);
            await client.sendMessage(M.from, { text: 'There was an error fetching the response from the AI.' }, { quoted: M });
        }
    }
};
