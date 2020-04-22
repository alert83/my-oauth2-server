import {BaseHttpController, controller, httpPost, request, response} from 'inversify-express-utils';
import {Express, Request, Response} from "express";
import {inject} from "inversify";
import {TYPE} from "../const";
import {StateUpdateRequest} from "st-schema";
import {IDeviceState, StConnector} from "../../stConnector";
import {MongoService} from "../../mongoService";
import {OAuth2Model} from "../../OAuth2Model";
import {compact} from "../../utils";

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

    @httpPost('/command')
    private async command(
        @request() req: Request,
        @response() res: Response,
    ) {
        console.log(req.headers, req.header('x-authorization') === process.env.AUTH_TOKEN);

        if (req.header('x-authorization') === process.env.AUTH_TOKEN) {

            // const device: IDevice | undefined = await this.client.withClient(async (db) => {
            //   const collection = db.collection<IDevice>('my-devices');
            //   return collection.findOne({externalDeviceId: req.body.deviceId});
            // });

            const externalDeviceId = req.body.deviceId;

            let value = req.body.value;
            value = !isNaN(Number(value)) ? Number(value) : value;

            let state: IDeviceState = compact({
                component: 'main',
                capability: req.body.capability,
                attribute: req.body.attribute,
                value,
                unit: req.body.unit,
                data: req.body.data,
            });
            state = compact(await this.st.updateMyState(externalDeviceId, state) ?? state);

            const deviceState = [{
                externalDeviceId,
                states: [state]
            }];

            const tokens = await this.client.withClient(async (db) => {
                const collection = db.collection('CallbackAccessTokens');
                return await collection.find({}).toArray();
            });

            for (const token of tokens) {
                const stateUpdateRequest = new StateUpdateRequest(
                    process.env.ST_CLIENT_ID,
                    process.env.ST_CLIENT_SECRET,
                );

                await stateUpdateRequest.updateState(
                    token.callbackUrls,
                    token.callbackAuthentication,
                    deviceState,
                );
            }
            res.end();
        } else {
            res.status(401).send('Unauthorized');
            res.end();
        }
    }
}
