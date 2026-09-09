const makeWASocket = require("baileys").default;
const fs = require("fs");
const {
    useMultiFileAuthState,
    DisconnectReason
} = require("baileys");

const qrcode = require("qrcode-terminal");
// const QRCode = require("qrcode");

const express = require("express");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

// let sock = null;


app.post("/create-job-group", async (req, res) => {

    try {

        if (!sock) {
            return res.status(503).json({
                error: "WhatsApp is not connected"
            });
        }


        const {
            name,
            participants
        } = req.body;


        if (!name) {
            return res.status(400).json({
                error: "Missing group name"
            });
        }


        if (!Array.isArray(participants)) {
            return res.status(400).json({
                error: "participants must be an array"
            });
        }


        const jids = participants.map(
            number => `${number}@s.whatsapp.net`
        );


        // Create the group
        const group = await sock.groupCreate(
            name,
            jids
        );


        console.log("Group created:", group.id);


        // Promote participants to admins
        if (jids.length > 0) {

            await sock.groupParticipantsUpdate(
                group.id,
                [jids[0]],
                "promote"
            );

        }


        console.log("Participants promoted.");


        res.json({
            success: true,
            groupId: group.id,
            name: name,
            participants: jids
        });

    } catch (error) {

        console.error("Failed to create group:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});

async function startWhatsApp() {
    console.log("CWD:", process.cwd());
    console.log("Auth exists:", fs.existsSync("./auth"));

    if (fs.existsSync("./auth")) {
        console.log("Auth files:", fs.readdirSync("./auth"));
    }

    const {
        state,
        saveCreds
    } = await useMultiFileAuthState("./auth/auth");

    console.log("Registered:", state.creds.registered);
    console.log("Account:", state.creds.me?.id || null);

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });


    sock.ev.on("creds.update", saveCreds);


    sock.ev.on("connection.update", async (update) => {

        const {
            connection,
            lastDisconnect,
            qr
        } = update;


        if (qr) {

            console.log("Scan this QR code:");
            // console.log(qr);
            qrcode.generate(qr, {
                small: true
            });
            // const qrImage = await QRCode.toDataURL(qr);
            // console.log(qrImage);

        }


    // if (connection === "open") {

    //     console.log("WhatsApp connected!");
    //     console.log("Logged in as:", sock.user.id);

    //     const participants = [
    //         "972507312654@s.whatsapp.net",
    //         "972525786960@s.whatsapp.net"
    //     ];

    //     try {

    //         const group = await sock.groupCreate(
    //             "My Test Group",
    //             participants
    //         );

    //         console.log("Group created!");
    //         console.log("Group ID:", group.id);

    //         await sock.groupParticipantsUpdate(
    //             group.id,
    //             participants[0],
    //             "promote"
    //         );

    //         console.log("Participants promoted to admins.");

    //     } catch (error) {

    //         console.error("Failed:", error);

    //     }
    // }


        if (connection === "close") {

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode
                !== DisconnectReason.loggedOut;


            console.log("WhatsApp disconnected.");


            if (shouldReconnect) {

                console.log("Reconnecting...");

                startWhatsApp();

            }

        }

    });


    // Listen for messages
    // sock.ev.on("messages.upsert", (event) => {

    //     for (const message of event.messages) {

    //         if (message.key.fromMe) {
    //             continue;
    //         }


    //         const sender =
    //             message.key.remoteJid;


    //         const text =
    //             message.message?.conversation ||
    //             message.message?.extendedTextMessage?.text;


    //         console.log("");
    //         console.log("==============================");
    //         console.log("New message");
    //         console.log("From:", sender);
    //         console.log("Message:", text);
    //         console.log("==============================");

    //     }

    // });

}


// ==============================
// START SERVER
// ==============================
// const PORT = process.env.PORT || 3000;

// app.listen(PORT, "0.0.0.0", () => {
//     console.log(`Server running on port ${PORT}`);
//     startWhatsApp();
// });
app.listen(PORT, () => {

    console.log(`Server listening on port ${PORT}`);

    startWhatsApp();

});