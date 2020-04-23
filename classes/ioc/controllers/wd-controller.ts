import {BaseHttpController, controller, httpGet, request, response} from 'inversify-express-utils';
import {Request, Response} from "express";
import {xAuthIsValid} from "../middlewares";

@controller('/wd')
class WdController extends BaseHttpController {

    @httpGet('/', xAuthIsValid())
    public async root(
        @request() req: Request,
        @response() res: Response,
    ) {
        console.log('reset');
        req.app.set('last reset', new Date());
        return res.status(200).send(true).end();
    }

}
