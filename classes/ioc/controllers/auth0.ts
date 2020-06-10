import {Express, Request, Response} from 'express';
import {inject} from 'inversify';
import {BaseHttpController, controller, httpGet, httpPost, request, response} from 'inversify-express-utils';
import {isEmpty} from 'lodash';

import {TYPE} from '../const';

import jwks from "jwks-rsa";
import jwt from "express-jwt";

const jwtCheck = jwt({
    secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: 'https://alert.auth0.com/.well-known/jwks.json'
    }),
    audience: 'https://my-oauth2-server.herokuapp.com/auth0',
    issuer: 'https://alert.auth0.com/',
    algorithms: ['RS256']
});

@controller('/auth0',)
class Auth0 extends BaseHttpController {

    constructor(
        @inject(TYPE.Application) private readonly app: Express,
    ) {
        super();
    }

    @httpGet('', jwtCheck)
    private root(
        @request() req: Request,
        @response() res: Response,
    ) {
        if (!(req as any).user) return res.sendStatus(401);
        res.send({...req.query, user: (req as any).user});
    }

    @httpPost('/ngrok')
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
}
