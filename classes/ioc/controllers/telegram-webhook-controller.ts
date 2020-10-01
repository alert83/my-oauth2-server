import {BaseHttpController, controller, httpGet, request, response} from 'inversify-express-utils';
import {Request, Response} from "express";
import {inject} from "inversify";

import {TYPE} from "../const";
import {xAuthIsValid} from "../middlewares";
import {WatchDogService} from "../../watchDogService";

@controller('/twh', xAuthIsValid())
class TelegramWebhookController extends BaseHttpController {

    constructor(
    ) {
        super();
    }

    @httpGet('/')
    public async root(
        @request() req: Request,
        @response() res: Response,
    ) {
        console.log(req.body);
        return res.status(200).send(true).end();
    }

}
