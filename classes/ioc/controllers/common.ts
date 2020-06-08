import {Express, Request, Response} from 'express';
import {inject} from 'inversify';
import {BaseHttpController, controller, httpGet, httpPost, request, response} from 'inversify-express-utils';
import {AuthorizationCode, Token} from "oauth2-server";
import {isEmpty} from 'lodash';
import moment from "moment";

import {TYPE} from '../const';
import {authorizeHandler, loginHandler, tokenHandler, xAuthIsValid} from "../middlewares";
import {OAuth2Model} from "../../OAuth2Model";

@controller('',)
class Common extends BaseHttpController {

    constructor(
        @inject(TYPE.Application) private readonly app: Express,
        @inject(TYPE.OAuth2Model) private readonly model: OAuth2Model,
    ) {
        super();
    }

    @httpGet('/auth')
    private getAuth(
        @request() req: Request,
        @response() res: Response,
    ) {
        // console.log('auth:', req.params, req.query, req.body);

        const client_id = req.query.client_id;
        const response_type = req.query.response_type;
        const redirect_uri = req.query.redirect_uri;
        const state = req.query.state;

        res.render('pages/login', {client_id, response_type, redirect_uri, state});
    }

    @httpPost('/login',
        loginHandler(),
        authorizeHandler({authenticateHandler: {handle: (req: any, res: any) => req.session.user}}),
    )
    private async login(
        @request() req: Request & any,
        @response() res: Response,
        // next: NextFunction,
    ) {
        // console.log('login:', req.params, req.query, req.body);

        const code: AuthorizationCode = res.locals?.oauth?.code;
        const state = req.query.state
        const redirectUri = req.query.redirect_uri

        let location = `${redirectUri}${redirectUri.includes('?') ? '&' : '?'}code=${code.authorizationCode}`;
        if (state) location += "&state=" + state;

        res.writeHead(307, {"Location": location});
        res.end();
    }

    @httpPost('/token', tokenHandler())
    private async token(
        @request() req: Request,
        @response() res: Response,
    ) {
        // console.log('token:', req.params, req.query, req.body);

        const token: Token = res.locals.oauth.token;
        res.send({
            ...token,

            access_token: token.accessToken,
            token_type: "bearer",
            refresh_token: token.refreshToken,
            expires_in: moment(token.accessTokenExpiresAt).diff(moment(), 'seconds'),
        });
        res.end();
    }

    //

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
