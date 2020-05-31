import {BaseHttpController, controller, httpGet, request, response} from 'inversify-express-utils';
import {Request, Response} from "express";
import {xAuthIsValid} from "../middlewares";
import {inject} from "inversify";
import {TYPE} from "../const";
import {WatchDogService} from "../../watchDogService";

@controller('/wd')
class WdController extends BaseHttpController {

    constructor(
        @inject(TYPE.WatchDogService) private readonly wd: WatchDogService,
    ) {
        super();
    }

    @httpGet('/', xAuthIsValid())
    public async root(
        @request() req: Request,
        @response() res: Response,
    ) {
        console.log('reset');
        this.wd.$reset$.next(new Date());
        return res.status(200).send(true).end();
    }

}
