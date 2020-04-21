import {Express, NextFunction, Request, Response} from 'express';
import {Container, inject} from 'inversify';
import {BaseHttpController, controller, httpGet, httpPost, request, response} from 'inversify-express-utils';
import {TYPE} from '../const';

import OAuth2Server, {AuthorizationCode} from "oauth2-server";
import {authorizeHandler, tokenHandler} from "../middlewares";
import {OAuth2Model} from "../../OAuth2Model";

const OAuth2Request = OAuth2Server.Request;
const OAuth2Response = OAuth2Server.Response;

@controller('/',)
class Common extends BaseHttpController {

    constructor(
        @inject(TYPE.Application) private readonly app: Express,
        @inject(TYPE.OAuth2Model) private readonly model: OAuth2Model,
    ) {
        super();
    }

    @httpGet('')
    public root(
        @request() req: Request,
        @response() res: Response,
    ) {
        console.log(req.params);
    }

    @httpGet('auth')
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

    @httpPost('auth',
        async (req, res, next) => {
            try {
                const container: Container = req.app.get('ioc container');
                const model = container.get<OAuth2Model>(TYPE.OAuth2Model);
                const user = await model.getUser(req.body.username, req.body.password);
                (req as any).session.user = user;
                next();
            } catch (err) {
                next(err);
            }
        },
        authorizeHandler({authenticateHandler: {handle: (req: any, res: any) => req.session.user}}),
    )
    private async postAuth(
        @request() req: Request & any,
        @response() res: Response,
        // next: NextFunction,
    ) {
        const code: AuthorizationCode = res.locals?.oauth?.code;
        const state = req.body.state

        let location = `${code.redirectUri}${code.redirectUri.includes('?') ? '&' : '?'}code=${code.authorizationCode}`;
        if (state) location += "&state=" + state;

        res.writeHead(307, {"Location": location});
        res.end();
    }

    @httpPost('token', tokenHandler())
    private async token(
        @request() req: Request,
        @response() res: Response,
    ) {
        res.send(res.locals.oauth.token);
        res.end();
    }
}
