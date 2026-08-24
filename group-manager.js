const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// const client = new Client({
//     authStrategy: new LocalAuth(),
//     webVersionCache: {
//         type: 'remote',
//         remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
//     }
// });

const client = new Client({
    authStrategy: new LocalAuth()
});

console.log("starting");

client.on('qr', qr => {
    console.log("QR code received");
    qrcode.generate(qr, { small: true });
});

client.on('message', async message => {
    // console.log('Message received:');
    console.log(message)
    console.log('From:', message.from);
    console.log('Body:', message.body);

    // if (message.body === '!ping') {
    //     // await message.reply('pong');
    // }
});

client.on('loading_screen', (percent, message) => {
    console.log("Loading:", percent, message);
});

client.on('authenticated', () => {
    console.log("Authenticated");
});

client.on('auth_failure', msg => {
    console.log("Auth failure:", msg);
});

client.on('ready', async () => {
    console.log('Ready!');

    try {
        const result = await client.createGroup(
            'My Group',
            [
                client.info.wid._serialized
            ]
        );

        console.log('Group created:', result);

        const groupId = result.gid._serialized;

        console.log('Group ID:', groupId);

        await client.sendMessage(
            groupId,
            'Hello from the bot!'
        );

        console.log('Message sent!');

        const inviteCode = await client.pupPage.evaluate(async (chatId) => {
            try {
                const result = await window
                    .require('WAWebMexFetchGroupInviteCodeJob')
                    .fetchMexGroupInviteCode(chatId);

                return result?.code ? result.code : result;
            } catch (err) {
                console.error('Invite error:', err);
                throw err;
            }
        }, groupId);

        console.log('Invite code:', inviteCode);
        console.log(
            'Invite link:',
            `https://chat.whatsapp.com/${inviteCode}`
        );

    } catch (err) {
        console.error('ERROR:', err);
    }
});

// client.on('ready', async () => {
//     console.log('Ready!');

//     try {
//         const result = await client.createGroup(
//             'My fucking Nigger',
//             [client.info.wid._serialized]
//         );
//         // const chats = await client.getChats();
//         console.log("Group created:", result);

//         const groupId = result.gid._serialized;

//         // console.log(groupId)


//         // console.log(group)
//         await client.sendMessage(
//             groupId,
//             'Hello from the bot!'
//         );
//         const group = await client.getChatById(groupId);
//         console.log(group)
//         console.log('Message sent!');
//         const link = await group.getInviteCode();
//         // const group = await client.getChatById('120363429880523841@g.us');
//         // const link = await group.getInviteCode();

//         // const inviteLink = `https://chat.whatsapp.com/${link}`;

//         // console.log("Group link:", inviteLink);

//     } catch (err) {
//         console.error(err);
//     }
// });
client.initialize();