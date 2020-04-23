import {BaseHttpController, controller, httpGet, request, response} from 'inversify-express-utils';
import {Request, Response} from "express";
import {xAuthIsValid} from "../middlewares";
import {createTransport} from "nodemailer";
import SMTPConnection from "nodemailer/lib/smtp-connection";
import requestPromise from "request-promise";

let timeoutId;

@controller('/wd')
class WdController extends BaseHttpController {

    @httpGet('', xAuthIsValid)
    public async root(
        @request() req: Request,
        @response() res: Response,
    ) {

        console.log('reset');
        this.reset();
        await this.sendState('clear');

        return this.ok('test');
    }

    private reset() {
        timeoutId && clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
            await this.onTimeOut();
            console.log('run again');
            this.reset();
        }, Number(process.env.TIMEOUT_SEC ?? 5) * 1000);
    }

    async onTimeOut() {
        console.log('timeout');

        await this.sendState('detected');

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

    async sendState(value) {
        await requestPromise({
            method: 'POST',
            uri: 'https://my-oauth2-server.herokuapp.com/st/command',
            headers: {'x-authorization': process.env.AUTH_TOKEN},
            body: {
                "devices": [{
                    "deviceId": "5e9f6449cbfe427e4234bb98",
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
}
