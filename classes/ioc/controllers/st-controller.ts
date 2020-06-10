import {BaseHttpController, controller, httpPost, request, response} from 'inversify-express-utils';
import {Express, Request, Response} from "express";
import {inject} from "inversify";
//
import {TYPE} from "../const";
import {StConnector} from "../../stConnector";
import {auth0Protected, xAuthIsValid} from "../middlewares";

@controller('/st')
class StController extends BaseHttpController {

    constructor(
        @inject(TYPE.Application) private readonly app: Express,
        @inject(TYPE.StConnector) private readonly st: StConnector,
    ) {
        super();
    }

    @httpPost('',
        (req, res, next) => {
            console.log('authenticateHandler:', req.headers, req.params, req.query, req.body);

            if (!req.headers.authorization && req.body?.authentication) {
                req.headers.authorization =
                    `${req.body?.authentication?.tokenType} ${req.body?.authentication?.token}`
            }

            next();
        },
        (req, res, next) => {
            auth0Protected()(req, res, (err) => {
                if (err) {
                    console.log('???');
                    return next(err);
                }

                if (!(req as any).user) {
                    console.log('!!!');
                    return res.sendStatus(401);
                }

                console.log({user: (req as any).user});

                next();
            });
        },
        // authenticateHandler(),
        // (req: any, res, next) => {
        //     if (req.user) return next();
        //     return res.status(401).send({});
        // },
    )
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
