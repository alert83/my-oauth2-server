import {BaseHttpController, controller, httpPost, request, response} from 'inversify-express-utils';
import {Express, Request, Response} from "express";
import {inject} from "inversify";
import {TYPE} from "../const";
import {StateUpdateRequest} from "st-schema";
import {IDeviceState, StConnector} from "../../stConnector";
import {MongoService} from "../../mongoService";
import {OAuth2Model} from "../../OAuth2Model";
import {compact} from "../../utils";
import Bluebird from "bluebird";

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

    private async xAuthIsValid(req: Request, res: Response) {
        if (req.header('x-authorization') === process.env.AUTH_TOKEN) {
            return true;
        }

        res.status(401).send('Unauthorized');
        return false;
    }

    @httpPost('/command')
    private async command(
        @request() req: Request,
        @response() res: Response,
    ) {
        if (await this.xAuthIsValid(req, res)) {

            console.log(req.body);

            const devices: any[] = req.body.devices ?? [];
            const deviceState: { externalDeviceId, states: IDeviceState[] }[] =
                await Bluebird.each(devices, async (d) => {
                    const externalDeviceId: string = d.deviceId;
                    let states: IDeviceState[] = d.states;

                    states = await Bluebird.mapSeries(states, async (s) => {
                        let value = s.value;
                        value = !isNaN(Number(value)) ? Number(value) : value;

                        const state: IDeviceState = compact({
                            component: 'main',
                            capability: s.capability,
                            attribute: s.attribute,
                            value,
                            unit: s.unit,
                            data: s.data,
                        });
                        return compact(await this.st.updateMyState(externalDeviceId, state) ?? state);
                    })

                    return {externalDeviceId, states};
                });

            console.log(deviceState);

            const tokens = await this.client.withClient(async (db) => {
                const collection = db.collection('CallbackAccessTokens');
                return await collection
                    .find({"callbackAuthentication.expiresAt": {$gte: new Date()}})
                    .sort({_id: -1})
                    .toArray();
            });

            await Promise.all(
                tokens.map(async (token) => {
                    const stateUpdateRequest = new StateUpdateRequest(
                        process.env.ST_CLIENT_ID,
                        process.env.ST_CLIENT_SECRET,
                    );

                    await stateUpdateRequest.updateState(
                        token.callbackUrls,
                        token.callbackAuthentication,
                        deviceState,
                    );
                })
            );

            res.send(true);
        }
    }
}
