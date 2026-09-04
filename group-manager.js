// const { Client, LocalAuth } = require('whatsapp-web.js');
// const qrcode = require('qrcode-terminal');

// // const client = new Client({
// //     authStrategy: new LocalAuth(),
// //     webVersionCache: {
// //         type: 'remote',
// //         remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
// //     }
// // });

// const client = new Client({
//     authStrategy: new LocalAuth()
// });

// console.log("starting");

// client.on('qr', qr => {
//     console.log("QR code received");
//     qrcode.generate(qr, { small: true });
// });

// client.on('message', async message => {
//     // console.log('Message received:');
//     console.log(message)
//     console.log('From:', message.from);
//     console.log('Body:', message.body);

//     // if (message.body === '!ping') {
//     //     // await message.reply('pong');
//     // }
// });

// client.on('loading_screen', (percent, message) => {
//     console.log("Loading:", percent, message);
// });

// client.on('authenticated', () => {
//     console.log("Authenticated");
// });

// client.on('auth_failure', msg => {
//     console.log("Auth failure:", msg);
// });

// client.on('ready', async () => {
//     console.log('Ready!');

//     try {
//         const result = await client.createGroup(
//             'My Group',
//             [
//                 client.info.wid._serialized
//             ]
//         );

//         console.log('Group created:', result);

//         const groupId = result.gid._serialized;

//         console.log('Group ID:', groupId);

//         await client.sendMessage(
//             groupId,
//             'Hello from the bot!'
//         );

//         console.log('Message sent!');

//         const inviteCode = await client.pupPage.evaluate(async (chatId) => {
//             try {
//                 const result = await window
//                     .require('WAWebMexFetchGroupInviteCodeJob')
//                     .fetchMexGroupInviteCode(chatId);

//                 return result?.code ? result.code : result;
//             } catch (err) {
//                 console.error('Invite error:', err);
//                 throw err;
//             }
//         }, groupId);

//         console.log('Invite code:', inviteCode);
//         console.log(
//             'Invite link:',
//             `https://chat.whatsapp.com/${inviteCode}`
//         );

//     } catch (err) {
//         console.error('ERROR:', err);
//     }
// });

// // client.on('ready', async () => {
// //     console.log('Ready!');

// //     try {
// //         const result = await client.createGroup(
// //             'My fucking Nigger',
// //             [client.info.wid._serialized]
// //         );
// //         // const chats = await client.getChats();
// //         console.log("Group created:", result);

// //         const groupId = result.gid._serialized;

// //         // console.log(groupId)


// //         // console.log(group)
// //         await client.sendMessage(
// //             groupId,
// //             'Hello from the bot!'
// //         );
// //         const group = await client.getChatById(groupId);
// //         console.log(group)
// //         console.log('Message sent!');
// //         const link = await group.getInviteCode();
// //         // const group = await client.getChatById('120363429880523841@g.us');
// //         // const link = await group.getInviteCode();

// //         // const inviteLink = `https://chat.whatsapp.com/${link}`;

// //         // console.log("Group link:", inviteLink);

// //     } catch (err) {
// //         console.error(err);
// //     }
// // });
// client.initialize();


const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    }
});
// hello
let isClientReady = false;

console.log("Starting WhatsApp client...");

client.on('qr', qr => {
    console.log("QR code received, scan with your phone:");
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    isClientReady = true;
    console.log('WhatsApp Client is Ready!');
});

client.on('auth_failure', msg => {
    console.log("Auth failure:", msg);
});

// --- API Endpoint for Supabase to Trigger ---
app.post('/create-job-group', async (req, res) => {
    if (!isClientReady) {
        return res.status(503).json({ error: 'WhatsApp client is not ready yet.' });
    }

    const { jobTitle, participantPhones } = req.body;

    // Send immediate response to prevent Supabase timeout
    res.json({ success: true, message: 'Group creation started in background' });

    try {
        console.log(`[Background] Creating group for job: ${jobTitle}`);

        // Normalize phone numbers to international format (e.g., 972...)
        const participants = participantPhones.map(phone => {
            let digits = phone.replace(/\D/g, ''); // Remove non-digits
            if (digits.startsWith('0')) {
                digits = '972' + digits.substring(1); // Convert local 05X to 9725X
            }
            return `${digits}@c.us`;
        });

        // Always include the bot/host owner
        participants.push(client.info.wid._serialized);

        console.log('Formatted participants:', participants);

        const result = await client.createGroup(jobTitle, participants);
        const groupId = result.gid._serialized;

        console.log('[Background] Group created successfully:', groupId);

        await client.sendMessage(groupId, `שלום! זוהי קבוצת הוואטסאפ הרשמית עבור המשרה: ${jobTitle}`);

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

        const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
        console.log('[Background] Invite link:', inviteLink);

    } catch (err) {
        console.error('[Background] ERROR creating group:', err);
    }
});

client.initialize();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Bridge server listening on port ${PORT}`);
});