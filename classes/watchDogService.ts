import {createTransport} from "nodemailer";
import SMTPConnection from "nodemailer/lib/smtp-connection";
import requestPromise from "request-promise";

let timeoutId;

export function reset() {
    timeoutId && clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
        await onTimeOut().catch();
        console.log('run again');
        reset();
    }, Number(process.env.TIMEOUT_SEC || 5) * 1000);
}

export async function onTimeOut() {
    console.log('timeout');

    await sendState('detected');

    const transporter = createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ?? 465,
        secure: true, // true for 465, false for other ports
        auth: {
            type: "LOGIN",
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        }
    } as SMTPConnection.Options);

    const info = await transporter.sendMail({
        from: process.env.SENDER,
        to: process.env.RECIPIENT,
        subject: process.env.SUBJECT,
        text: "-'",
        html: "<b>watch dog raised</b>",
    });

    transporter.close();

    return info;
}

export async function sendState(value) {
    await requestPromise({
        method: 'POST',
        uri: 'https://my-oauth2-server.herokuapp.com/st/command',
        headers: {'x-authorization': process.env.AUTH_TOKEN},
        body: {
            "devices": [{
                "deviceId": process.env.WATCH_DOG_ID,
                "states": [{
                    "capability": "st.tamperAlert",
                    "attribute": "tamper",
                    "value": value,
                }]
            }]
        },
        json: true
    })
        .then(res => {
            console.log(res);
        })
        .catch(err => {
            console.error(err);
        });
}
