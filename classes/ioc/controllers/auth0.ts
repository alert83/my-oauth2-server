import {Express, Request, Response} from 'express';
import {inject} from 'inversify';
import {BaseHttpController, controller, httpGet, httpPost, request, response} from 'inversify-express-utils';
import {isEmpty} from 'lodash';


import {TYPE} from '../const';


@controller('/auth0',)
class Auth0 extends BaseHttpController {

    constructor(
        @inject(TYPE.Application) private readonly app: Express,
    ) {
        super();
    }

    @httpGet('')
    private root(
        @request() req: Request,
        @response() res: Response,
    ) {
        if (!(req as any).user) return res.sendStatus(401);
        res.send({
            query: req.query,
            user: (req as any).user
        });
    }

}
