import {BaseHttpController, controller, httpPost, request, response} from 'inversify-express-utils';
import {Express, Request, Response} from "express";
import {inject} from "inversify";
import {TYPE} from "../const";
import {StateUpdateRequest} from "st-schema";
import {StConnector} from "../../stConnector";
import {MongoService} from "../../mongoService";

@controller('/st')
class StController extends BaseHttpController {

  constructor(
      @inject(TYPE.Application) private readonly app: Express,
      @inject(TYPE.StConnector) private readonly st: StConnector,
      @inject(TYPE.MongoDBClient) private readonly client: MongoService,
  ) {
    super();
  }

  @httpPost('')
  private async main(
      @request() req: Request,
      @response() res: Response,
  ) {
    console.log(req);

    // if (accessTokenIsValid(req, res)) {
    await this.st.connector.handleHttpCallback(req, res)
    // }
  }

  @httpPost('command')
  private async command(
      @request() req: Request,
      @response() res: Response,
  ) {
    this.st.deviceStates[req.body.deviceId][req.body.attribute] = req.body.value;

    const tokens = await this.client.withClient(async (db) => {
      const collection = db.collection('CallbackAccessTokens');
      return  await collection.find({}).toArray();
    });

    for (const token of tokens) {
      const deviceState = [{
        externalDeviceId: req.body.deviceId,
        states: [
          {
            component: 'main',
            capability: req.body.attribute === 'level' ? 'st.switchLevel' : 'st.switch',
            attribute: req.body.attribute,
            value: req.body.value
          }
        ]
      }];

      const stateUpdateRequest = new StateUpdateRequest(
          process.env.ST_CLIENT_ID,
          process.env.ST_CLIENT_SECRET,
      );

      console.log('stateUpdateRequest:', token);

      await stateUpdateRequest.updateState(
          token.callbackUrls,
          token.callbackAuthentication,
          deviceState,
      );
    }

    res.end();
  }
}
