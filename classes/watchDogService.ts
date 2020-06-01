import {createTransport} from "nodemailer";
import SMTPConnection from "nodemailer/lib/smtp-connection";
import {Express} from "express";
import {inject} from "inversify";
import {TYPE} from "./ioc/const";
import {StConnector} from "./stConnector";
import {BehaviorSubject, interval} from "rxjs";
import {map, switchMap} from "rxjs/operators";
import {provideIf} from "./ioc/ioc";
import moment from "moment";

@provideIf(TYPE.WatchDogService, true)
export class WatchDogService {
    $reset$: BehaviorSubject<Date> = new BehaviorSubject(new Date());

    constructor(
        @inject(TYPE.Application) private readonly app: Express,
        @inject(TYPE.StConnector) private readonly st: StConnector,
    ) {
    }

    process() {
        const secs = Number(process.env.TIMEOUT_SEC || 5);
        console.log('wd secs: ', secs);

        interval(5000).pipe(
            map(() => {
                const last = this.$reset$.getValue();
                const diff = moment().diff(moment(last), 'seconds');
                return diff;
            }),
            switchMap(async (diff) => {
                if (diff > secs) {
                    // console.log('detected');
                    await this.sendState('detected');
                    // await sendAlertEmail().catch((err) => console.error(err.message));
                } else {
                    // console.log('clear');
                    await this.sendState('clear');
                }
            }),
        ).subscribe();
    }

    async sendAlertEmail() {
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

    async sendState(value: 'clear' | 'detected') {
        // console.log(value);

        await this.st.setStates([{
            "deviceId": process.env.WATCH_DOG_ID,
            "states": [{
                "capability": "st.healthCheck",
                "attribute": "healthStatus",
                "value": "online"
            }, {
                "capability": "st.healthCheck",
                "attribute": "checkInterval",
                "value": 30,
                "unit": "s"
            }, {
                "capability": "st.tamperAlert",
                "attribute": "tamper",
                "value": value,
            }, {
                "capability": "st.panicAlarm",
                "attribute": "panicAlarm",
                "value": value === "clear" ? "clear" : "panic",
            }]
        }]);
    }
}
