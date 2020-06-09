import {BaseHttpController, controller, httpPost, request, response} from 'inversify-express-utils';
import {Express, Request, Response} from "express";
import {inject} from "inversify";
//
import {TYPE} from "../const";
import {StConnector} from "../../stConnector";
import {authenticateHandler, xAuthIsValid} from "../middlewares";

@controller('/st')
class StController extends BaseHttpController {

    constructor(
        @inject(TYPE.Application) private readonly app: Express,
        @inject(TYPE.StConnector) private readonly st: StConnector,
    ) {
        super();
    }

    @httpPost('', authenticateHandler())
    private async main(
        @request() req: Request,
        @response() res: Response,
    ) {
        await this.st.connector.handleHttpCallback(req, res)
    }

    @httpPost('/command', xAuthIsValid())
    private async command(
        @request() req: Request,
        @response() res: Response,
    ) {
        // console.log(req.body);

        const devices: any[] = req.body.devices ?? [];
        await this.st.setStates(devices);
        res.status(200).send(true);
    }
}
