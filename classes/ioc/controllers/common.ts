import {Express, Request, Response} from 'express';
import {inject} from 'inversify';
import {BaseHttpController, controller, httpGet, httpPost, request, response} from 'inversify-express-utils';
import {isEmpty} from 'lodash';

import {TYPE} from '../const';
import {xAuthIsValid} from "../middlewares";

@controller('',)
class Common extends BaseHttpController {

    constructor(
        @inject(TYPE.Application) private readonly app: Express,
    ) {
        super();
    }

    @httpGet('', xAuthIsValid())
    private root(
        @request() req: Request,
        @response() res: Response,
    ) {
        res.send(req.query);
        res.end();
    }

    @httpPost('/ngrok', xAuthIsValid())
    private async ngrok(
        @request() req: Request,
        @response() res: Response,
    ) {
        const cbUrl: string = req.body.url;

        if (!isEmpty(cbUrl)) {
            const redis = this.app.get('redis');
            await redis.set("ngrok", cbUrl);

            res.status(200).send(await redis.get("ngrok"));
        } else {
            res.status(500).send('Empty cb url')
        }
    }

    //

    // @httpGet('/oauth/callback')
    // private async oauthCallback(
    //     @request() req: Request,
    //     @response() res: Response,
    // ) {
    //     console.log('oauth/callback:', req.params, req.query, req.body);
    //     res.end();
    // }
}
