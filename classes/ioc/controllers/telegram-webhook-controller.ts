import {BaseHttpController, controller, httpGet, httpPost, request, response} from 'inversify-express-utils';
import {Express, Request, Response} from "express";
import {inject} from "inversify";

import {TYPE} from "../const";
import {xAuthIsValid} from "../middlewares";
import {WatchDogService} from "../../watchDogService";
import got from "got";
import * as Sentry from "@sentry/node";

@controller('/twh', xAuthIsValid())
class TelegramWebhookController extends BaseHttpController {

    constructor(
        @inject(TYPE.Application) private readonly app: Express,
    ) {
        super();
    }

    @httpPost('/')
    public async root(
        @request() req: Request,
        @response() res: Response,
    ) {
        console.log(req.body);

        const redis = this.app.get('redis');
        await got.post(await redis.get("ngrok") ?? '', {
            username: process.env.NGROK_USER,
            password: process.env.NGROK_PASS,
            json: req.body,
        }).catch((err) => {
            try {
                Sentry.captureException(err);
            } catch (e) {
                console.error(e);
            }
        });

        return res.status(200).send(true).end();
    }

}
