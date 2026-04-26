const { createCanvas, loadImage } = require('canvas');

const makeWelcomeImage = async (pfpBuffer, username, groupName) => {
    const W = 800, H = 300;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#e8c84b';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, W - 16, H - 16);

    const avatarSize = 160;
    const ax = 60, ay = (H - avatarSize) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ax + avatarSize / 2, ay + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    try {
        const avatar = await loadImage(pfpBuffer);
        ctx.drawImage(avatar, ax, ay, avatarSize, avatarSize);
    } catch {
        ctx.fillStyle = '#444';
        ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = '#e8c84b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ax + avatarSize / 2, ay + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2);
    ctx.stroke();

    const tx = ax + avatarSize + 40;
    ctx.fillStyle = '#e8c84b';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('WELCOME', tx, 90);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    const name = username.length > 18 ? username.slice(0, 18) + '...' : username;
    ctx.fillText(name, tx, 135);

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '20px sans-serif';
    const gn = (groupName || '').length > 22 ? (groupName || '').slice(0, 22) + '...' : (groupName || '');
    ctx.fillText(`to ${gn}`, tx, 175);

    ctx.fillStyle = '#e8c84b';
    ctx.font = '16px sans-serif';
    ctx.fillText('Glad to have you here! 🎉', tx, 215);

    return canvas.toBuffer('image/png');
};

module.exports = EventsHandler = async (event, client) => {
    try {
        const activateEvents = (await client.DB.get('events')) || [];
        const groupMetadata = await client.groupMetadata(event.id).catch(() => null);
        if (!groupMetadata) return;
        const botJid = client.user?.id || client.user?.jid;
        const botAdded =
            event.action === 'add' &&
            botJid &&
            event.participants?.some((jid) => String(jid) === String(botJid));

        if (!activateEvents.includes(event.id) && !botAdded) return;

        if (botAdded) {
            const mentions = (groupMetadata.participants || []).map((p) => p.id || p.jid).filter(Boolean);
            await client.sendMessage(event.id, {
                text: `Thanks for adding me here. Use *${client.prefix}help* to start.`,
                mentions
            });
            return;
        }

        const text =
            event.action === 'add'
                ? `- ${groupMetadata.subject} -\n\n💈 *Group Description:*\n${
                      groupMetadata.desc || ''
                  }\n\nHope you follow the rules and have fun!\n\n*‣ ${event.participants
                      .map((jid) => `@${jid.split('@')[0]}`)
                      .join(' ')}*`
                : event.action === 'remove'
                ? `Goodbye *${event.participants
                      .map((jid) => `@${jid.split('@')[0]}`)
                      .join(', ')}* 👋🏻, we're probably not gonna miss you.`
                : event.action === 'demote'
                ? `Ara Ara, looks like *@${event.participants[0].split('@')[0]}* got Demoted`
                : `Congratulations *@${event.participants[0].split('@')[0]}*, you're now an admin`;

        if (event.action === 'add') {
            const user = event.participants[0];
            const username = (await client.contact.getContact(user, client)).username;
            let pfpBuffer;
            try {
                const imageUrl = await client.profilePictureUrl(user, 'image');
                pfpBuffer = await client.utils.getBuffer(imageUrl);
            } catch {
                pfpBuffer = await client.utils.getBuffer(
                    'https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg'
                );
            }

            let welcomeImg;
            try {
                welcomeImg = await makeWelcomeImage(pfpBuffer, username, groupMetadata.subject || '');
            } catch (_) {
                welcomeImg = null;
            }

            if (welcomeImg) {
                return void (await client.sendMessage(event.id, {
                    image: welcomeImg,
                    mentions: event.participants,
                    caption: text
                }));
            }
        }

        client.sendMessage(event.id, {
            text,
            mentions: event.participants
        });
    } catch (error) {
        console.error('EventsHandler error:', error);
    }
};
