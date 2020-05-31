import {createTransport} from "nodemailer";
import SMTPConnection from "nodemailer/lib/smtp-connection";
import {Application} from "express";
import moment from "moment";
import {Container} from "inversify";
import {TYPE} from "./ioc/const";
import {StConnector} from "./stConnector";


export async function wdProcess(app: Application) {
    const secs = Number(process.env.TIMEOUT_SEC || 5);
    // console.log(secs);

    setInterval(async () => {
        const last: Date = app.get('last reset');
        const diff = moment().diff(moment(last), 'seconds');

        // console.log(diff);

        if (diff > secs) {
            // console.log('timeout');
            await sendState('detected', app);
            await sendAlertEmail().catch((err) => console.error(err.message));
        } else {
            // console.log('clear');
            await sendState('clear', app);
        }
    }, 10 * 1000);
}

export async function sendAlertEmail() {
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

export async function sendState(value, app: Application) {
    // console.log(value);

    const container: Container = app.get('ioc container');
    const st = container.get<StConnector>(TYPE.StConnector);

    await st.setStates([{
        "deviceId": process.env.WATCH_DOG_ID,
        "states": [{
            "capability": "st.tamperAlert",
            "attribute": "tamper",
            "value": value,
        },{
            "capability": "st.healthCheck",
            "attribute": "healthStatus",
            "value": "online",
        }]
    }]);
}
