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
    console.log(req.body);

    if (this.accessTokenIsValid(req, res)) {
      await this.st.connector.handleHttpCallback(req, res)
    }
  }

  private accessTokenIsValid(req: Request, res: Response) {
    // Replace with proper validation of issued access token
    if (req.body.authentication && req.body.authentication.token) {
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
