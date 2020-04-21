import {Express, Request, Response} from 'express';
import {inject} from 'inversify';
import {BaseHttpController, controller, httpGet, httpPost, request, response} from 'inversify-express-utils';
import {TYPE} from '../const';

import OAuth2Server from "oauth2-server";
import {authorizeHandler} from "../middlewares";
import {InMemoryModel} from "../../model";

const OAuth2Request = OAuth2Server.Request;
const OAuth2Response = OAuth2Server.Response;

@controller('/',)
class Common extends BaseHttpController {

    constructor(
        @inject(TYPE.Application) private readonly app: Express,
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
    private auth(
        @request() req: Request,
        @response() res: Response,
    ) {
        const client_id = req.query.client_id;
        const response_type = req.query.response_type;
        const redirect_uri = req.query.redirect_uri;
        const state = req.query.state;

        res.render('pages/login', {client_id, response_type, redirect_uri, state});
    }

    @httpPost('login')
    private async login(
        @request() req: Request,
        @response() res: Response,
    ) {
        console.log(req.body);

        const _request = new OAuth2Request(req);
        const _response = new OAuth2Response(res);

        const oAuth2: OAuth2Server = this.app.get('oauth2');

        const token = await oAuth2.token(_request, _response);

        console.log(token);
    }

    @httpGet('any', authorizeHandler())
    private any(
        @request() req: Request,
        @response() res: Response,
    ) {
        res.send(true);
        res.end();
    }
}
