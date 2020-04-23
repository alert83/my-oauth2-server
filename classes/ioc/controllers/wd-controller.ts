import {BaseHttpController, controller, httpGet, request, response} from 'inversify-express-utils';
import {Request, Response} from "express";
import {xAuthIsValid} from "../middlewares";
import {WatchDogService} from "../../watchDogService";

@controller('/wd')
class WdController extends BaseHttpController {

    @httpGet('/', xAuthIsValid())
    public async root(
        @request() req: Request,
        @response() res: Response,
    ) {
        console.log('reset');
        WatchDogService.reset();
        await WatchDogService.sendState('clear');

        return res.status(200).send(true).end();
    }

}
