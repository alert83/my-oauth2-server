import {Express, Request, Response} from 'express';
import {inject} from 'inversify';
import {BaseHttpController, controller, httpGet, httpPost, request, response} from 'inversify-express-utils';
import {TYPE} from '../const';

import {AuthorizationCode, Token} from "oauth2-server";
import {authorizeHandler, loginHandler, tokenHandler} from "../middlewares";
import {OAuth2Model} from "../../OAuth2Model";
import moment from "moment";

@controller('',)
class Common extends BaseHttpController {

    constructor(
        @inject(TYPE.Application) private readonly app: Express,
        @inject(TYPE.OAuth2Model) private readonly model: OAuth2Model,
    ) {
        super();
    }

    @httpGet('')
    private root(
        @request() req: Request,
        @response() res: Response,
    ) {
        res.send(req.query);
        res.end();
    }

    @httpGet('/auth')
    private getAuth(
        @request() req: Request,
        @response() res: Response,
    ) {
        const client_id = req.query.client_id;
        const response_type = req.query.response_type;
        const redirect_uri = req.query.redirect_uri;
        const state = req.query.state;

        res.render('pages/login', {client_id, response_type, redirect_uri, state});
    }

    @httpGet('/login',
        loginHandler(),
        authorizeHandler({authenticateHandler: {handle: (req: any, res: any) => req.session.user}}),
    )
    private async login(
        @request() req: Request & any,
        @response() res: Response,
        // next: NextFunction,
    ) {
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
}
