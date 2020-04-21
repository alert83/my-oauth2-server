import {BaseHttpController, controller, httpPost, request, response} from 'inversify-express-utils';
import {Express, Request, Response} from "express";
import {inject} from "inversify";
import {TYPE} from "../const";
import {StateUpdateRequest} from "st-schema";
import {StConnector} from "../../stConnector";
import {MongoService} from "../../mongoService";
import {OAuth2Model} from "../../OAuth2Model";

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

    private async accessTokenIsValid(req: Request, res: Response) {
        const token = req.body?.authentication?.token || req.body?.token;
        if (token && await this.model.getAccessToken(token)) {
            return true;
        }

        res.status(401).send('Unauthorized');
        return false;
    }

    @httpPost('command')
    private async command(
        @request() req: Request,
        @response() res: Response,
    ) {
        if (await this.accessTokenIsValid(req, res)) {

            // const device: IDevice | undefined = await this.client.withClient(async (db) => {
            //   const collection = db.collection<IDevice>('my-devices');
            //   return collection.findOne({externalDeviceId: req.body.deviceId});
            // });

            const deviceState = [{
                externalDeviceId: req.body.deviceId,
                states: [{
                    component: 'main',
                    capability: req.body.capability,
                    attribute: req.body.attribute,
                    value: req.body.value
                }]
            }];

            await this.st.updateMyState(deviceState[0].externalDeviceId, deviceState[0].states[0]);

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
        }
    }
}
