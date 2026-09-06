
// const { Client, LocalAuth } = require('whatsapp-web.js');
// const QRCode = require('qrcode');
// const express = require('express');

// const app = express();
// app.use(express.json());

// const client = new Client({
//     authStrategy: new LocalAuth(),
//     puppeteer: {
//     args: [ '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu' ]
//     }
// });
// // h
// let isClientReady = false;

// console.log("Starting WhatsApp client...");

// client.on('qr', async qr => {
//     console.log("QR code received!");

//     const qrDataUrl = await QRCode.toDataURL(qr);

//     console.log("QR_DATA_START");
//     console.log(qrDataUrl);
//     console.log("QR_DATA_END");
// });

// client.on('ready', () => {
//     isClientReady = true;
//     console.log('WhatsApp Client is Ready!');
// });

// client.on('auth_failure', msg => {
//     console.log("Auth failure:", msg);
// });

// // --- API Endpoint for Supabase to Trigger ---
// app.post('/create-job-group', async (req, res) => {
//     console.log("got a request");
//     if (!isClientReady) {
//         return res.status(503).json({ error: 'WhatsApp client is not ready yet.' });
//     }

//     const { jobTitle, participantPhones } = req.body;

//     // Send immediate response to prevent Supabase timeout
//     res.json({ success: true, message: 'Group creation started in background' });

//     try {
//         console.log(`[Background] Creating group for job: ${jobTitle}`);

//         // Normalize phone numbers to international format (e.g., 972...)
//         const participants = participantPhones.map(phone => {
//             let digits = phone.replace(/\D/g, ''); // Remove non-digits
//             if (digits.startsWith('0')) {
//                 digits = '972' + digits.substring(1); // Convert local 05X to 9725X
//             }
//             return `${digits}@c.us`;
//         });

//         // Always include the bot/host owner
//         participants.push(client.info.wid._serialized);

//         console.log('[Background] Calling createGroup...'); 
//         console.log('[Background] Job:', jobTitle);
//         console.log('[Background] Participants:', participants);

//         const result = await client.createGroup(jobTitle, participants);
//         console.log('[Background] createGroup() returned:', result);
//         const groupId = result.gid._serialized;

//         console.log('[Background] Group created successfully:', groupId);

//         await client.sendMessage(groupId, `שלום! זוהי קבוצת הוואטסאפ הרשמית עבור המשרה: ${jobTitle}`);

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

//         const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
//         console.log('[Background] Invite link:', inviteLink);

//     } catch (err) {
//         console.error('[Background] ERROR creating group:', err);
//     }
// });

// client.initialize();

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Bridge server listening on port ${PORT}`);
// });


const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const express = require('express');

const app = express();
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: '/app/.wwebjs_auth'
    }),

    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

let isClientReady = false;

console.log('Starting WhatsApp client...');


// ================================
// WhatsApp Events
// ================================

client.on('qr', async (qr) => {
    console.log('QR code received!');

    try {
        const qrDataUrl = await QRCode.toDataURL(qr);

        console.log('QR_DATA_START');
        console.log(qrDataUrl);
        console.log('QR_DATA_END');
    } catch (err) {
        console.error('Failed to generate QR code:', err);
    }
});


client.on('authenticated', () => {
    console.log('WhatsApp authenticated!');
});


client.on('auth_failure', (msg) => {
    isClientReady = false;

    console.error('WhatsApp authentication failure:', msg);
});


client.on('loading_screen', (percent, message) => {
    console.log(`WhatsApp loading: ${percent}% - ${message}`);
});


client.on('change_state', (state) => {
    console.log('WhatsApp state changed:', state);
});


client.on('ready', () => {
    isClientReady = true;

    console.log('====================================');
    console.log('WhatsApp Client is Ready!');
    console.log('WhatsApp number:', client.info?.wid?._serialized);
    console.log('====================================');
});


client.on('disconnected', (reason) => {
    isClientReady = false;

    console.log('WhatsApp disconnected:', reason);
});


client.on('error', (err) => {
    console.error('WhatsApp client error:', err);
});


// ================================
// Create Job Group
// ================================

app.post('/create-job-group', async (req, res) => {
    console.log('');
    console.log('====================================');
    console.log('Received create-job-group request');
    console.log('====================================');

    if (!isClientReady) {
        console.log('WhatsApp client is not ready.');

        return res.status(503).json({
            error: 'WhatsApp client is not ready yet.'
        });
    }

    const { jobTitle, participantPhones } = req.body;

    if (!jobTitle) {
        return res.status(400).json({
            error: 'Missing jobTitle.'
        });
    }

    if (!Array.isArray(participantPhones)) {
        return res.status(400).json({
            error: 'participantPhones must be an array.'
        });
    }

    // Respond immediately so Supabase does not wait
    // for the WhatsApp operations to finish.

    res.json({
        success: true,
        message: 'Group creation started in background.'
    });

    try {
        console.log(
            `[Background] Creating group for job: ${jobTitle}`
        );

        // ================================
        // Validate participants
        // ================================

        const participants = [];

        for (const phone of participantPhones) {
            let digits = String(phone).replace(/\D/g, '');

            // Convert Israeli local number:
            // 05XXXXXXXX -> 9725XXXXXXXX

            if (digits.startsWith('0')) {
                digits = '972' + digits.substring(1);
            }

            console.log(
                `[Background] Checking participant: ${digits}`
            );

            try {
                const numberId = await client.getNumberId(digits);

                if (!numberId) {
                    console.log(
                        `[Background] Number is not registered on WhatsApp: ${digits}`
                    );

                    continue;
                }

                participants.push(numberId._serialized);

                console.log(
                    `[Background] Valid participant: ${numberId._serialized}`
                );

            } catch (err) {
                console.error(
                    `[Background] Failed checking number ${digits}:`,
                    err
                );
            }
        }


        // ================================
        // Add bot itself
        // ================================

        const ownerId = client.info?.wid?._serialized;

        if (!ownerId) {
            throw new Error(
                'Could not determine WhatsApp account ID.'
            );
        }

        participants.push(ownerId);

        console.log(
            '[Background] Final participants:',
            participants
        );


        // ================================
        // Create group
        // ================================

        console.log(
            '[Background] Calling createGroup()...'
        );

        const result = await client.createGroup(
            jobTitle,
            participants
        );

        console.log(
            '[Background] createGroup() returned:',
            result
        );


        // ================================
        // Get group ID
        // ================================

        const groupId = result?.gid?._serialized;

        if (!groupId) {
            throw new Error(
                'Group was created but no group ID was returned.'
            );
        }

        console.log(
            '[Background] Group created successfully:',
            groupId
        );


        // ================================
        // Send welcome message
        // ================================

        await client.sendMessage(
            groupId,
            `שלום! זוהי קבוצת הוואטסאפ הרשמית עבור המשרה: ${jobTitle}`
        );

        console.log(
            '[Background] Welcome message sent.'
        );


        // ================================
        // Get invite code
        // ================================

        console.log(
            '[Background] Getting group invite code...'
        );

        const inviteCode = await client.pupPage.evaluate(
            async (chatId) => {
                const result = await window
                    .require('WAWebMexFetchGroupInviteCodeJob')
                    .fetchMexGroupInviteCode(chatId);

                return result?.code ?? result;
            },
            groupId
        );

        if (!inviteCode) {
            throw new Error(
                'Could not retrieve group invite code.'
            );
        }


        // ================================
        // Create invite link
        // ================================

        const inviteLink =
            `https://chat.whatsapp.com/${inviteCode}`;

        console.log(
            '[Background] Invite link:',
            inviteLink
        );

        console.log(
            `[Background] Finished creating group for "${jobTitle}".`
        );

    } catch (err) {
        console.error(
            '[Background] ERROR creating group:',
            err
        );
    }
});


// ================================
// Health Check
// ================================

app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        whatsappReady: isClientReady
    });
});


// ================================
// Initialize WhatsApp
// ================================

client.initialize().catch((err) => {
    isClientReady = false;

    console.error(
        'WhatsApp initialize() failed:',
        err
    );
});


// ================================
// Start Express Server
// ================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(
        `Bridge server listening on port ${PORT}`
    );
});


