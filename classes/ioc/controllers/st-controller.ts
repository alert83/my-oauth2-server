import {BaseHttpController, controller, httpPost, request, response} from 'inversify-express-utils';
import {Express, Request, Response} from "express";
import {inject} from "inversify";
import {TYPE} from "../const";
import {StConnector} from "../../stConnector";
import {MongoService} from "../../mongoService";
import {OAuth2Model} from "../../OAuth2Model";
import {xAuthIsValid} from "../middlewares";

@controller('/st')
class StController extends BaseHttpController {

    constructor(
        @inject(TYPE.Application) private readonly app: Express,
        @inject(TYPE.StConnector) private readonly st: StConnector,
        @inject(TYPE.MongoDBClient) private readonly client: MongoService,
        @inject(TYPE.OAuth2Model) private readonly model: OAuth2Model,
    ) {
        super();
    }

    private async accessTokenIsValid(req: Request, res: Response) {
        const token = req.body?.authentication?.token || req.body?.token;
        if (token && await this.model.getAccessToken(token)) {
            return true;
        }

        res.status(401).send('Unauthorized');
        return false;
    }

    @httpPost('')
    private async main(
        @request() req: Request,
        @response() res: Response,
    ) {
        // console.log(req.headers, req.body);

        if (await this.accessTokenIsValid(req, res)) {
            await this.st.connector.handleHttpCallback(req, res)
        }
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
