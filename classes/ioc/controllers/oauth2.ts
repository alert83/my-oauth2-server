import {Express, Request, Response} from 'express';
import {inject} from 'inversify';
import {BaseHttpController, controller, httpGet, httpPost, request, response} from 'inversify-express-utils';

import {TYPE} from '../const';
import {authorizeHandler, checkSessionUserHandler, loginHandler, tokenHandler} from "../middlewares";
import {OAuth2Model} from "../../OAuth2Model";
import {stringify} from "querystring";

@controller('/oauth2',)
class Oauth2 extends BaseHttpController {

    constructor(
        @inject(TYPE.Application) private readonly app: Express,
        @inject(TYPE.OAuth2Model) private readonly model: OAuth2Model,
    ) {
        super();
    }

    // Post token.
    @httpPost('/token', tokenHandler())
    private async token(
        @request() req: Request,
        @response() res: Response,
    ) {
        console.log('post token:', req.params, req.query, req.body, res.locals.body);
        res.send(res.locals.body);

        // const token: Token = res.locals.oauth.token;
        // res.send({
        //     ...token,
        //
        //     access_token: token.accessToken,
        //     token_type: "bearer",
        //     refresh_token: token.refreshToken,
        //     expires_in: moment(token.accessTokenExpiresAt).diff(moment(), 'seconds'),
        // });
        // res.end();
    }

    // Get authorization.
    @httpGet('/authorize', checkSessionUserHandler())
    private getAuthorize(
        @request() req: Request,
        @response() res: Response,
    ) {
        console.log('get authorize:', req.params, req.query, req.body);

        const username = req.session?.user.username;
        const client_id = req.query.client_id;
        const response_type = req.query.response_type;
        const redirect_uri = req.query.redirect_uri;
        const state = req.query.state;

        res.render('pages/authorize', {username, client_id, response_type, redirect_uri, state});
    }

    // Post authorization.
    @httpPost('/authorize',
        checkSessionUserHandler(),
        authorizeHandler({authenticateHandler: {handle: (req: any, res: any) => req.session.user}}),
    )
    private authorize(
        @request() req: Request,
        @response() res: Response,
    ) {
        console.log('post authorize:', req.params, req.query, req.body);
        // const code: AuthorizationCode = res.locals?.oauth?.code;
    }

    // Get login.
    @httpGet('/login')
    private getLogin(
        @request() req: Request,
        @response() res: Response,
    ) {
        console.log('get login:', req.params, req.query, req.body);

        const client_id = req.query.client_id;
        const response_type = req.query.response_type;
        const redirect_uri = req.query.redirect_uri;
        const state = req.query.state;
        const err_msg = req.query.err_msg;

        res.render('pages/login', {client_id, response_type, redirect_uri, state, err_msg});
    }


    @httpPost('/login', loginHandler())
    private postLogin(
        @request() req: Request,
        @response() res: Response,
    ) {
        console.log('post login:', req.params, req.query, req.body);
        return res.redirect('/oauth2/authorize?' + stringify(req.body));
    }

    // Get login.
    @httpGet('/logout')
    private getLogout(
        @request() req: Request,
        @response() res: Response,
    ) {
        console.log('get logout:', req.params, req.query, req.body);
        if (req.session) req.session.user = undefined;
    }
}
