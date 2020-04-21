import 'reflect-metadata';
import {config} from "dotenv";
//
import {Container} from "inversify";
import {buildProviderModule} from "inversify-binding-decorators";
import {InversifyExpressServer} from "inversify-express-utils";
import {TYPE} from "./classes/ioc/const";
import express from "express";
import session from "express-session";
import errorHandler from "strong-error-handler";
import {json, urlencoded} from "body-parser";
import {join} from "path";
//
// load all injectable entities.
// the @provide() annotation will then automatically register them.
import './classes/ioc/loader';
//
import {StateUpdateRequest} from "st-schema";
import OAuth2Server from "oauth2-server";
import {InMemoryModel} from "./classes/model";


config();

const Request = OAuth2Server.Request;
const Response = OAuth2Server.Response;
const PORT = process.env.PORT || 5000

const container = new Container();
container.load(buildProviderModule());
const app = express();

container.bind(TYPE.Application).toConstantValue(app);
app.set('ioc container', container);

const model = new InMemoryModel();
const oAuth2 = new OAuth2Server({model});

const server = new InversifyExpressServer(container, null, null, app);
server.setConfig((_app) => {
    _app
        .use(session({
            secret: "38240a30-5ed7-41f2-981c-4a9603f332f2",
            resave: false,
            saveUninitialized: true,
            cookie: {secure: false}
        }))
        .use(json())
        .use(urlencoded({extended: false}))
        .use(express.static(join(__dirname, 'public')))
        .use(errorHandler({
            debug: app.get('env') === 'development',
            log: true,
        }))
        .set('oauth2', oAuth2)
        .set('model', model)
        .set('views', join(__dirname, 'views'))
        .set('view engine', 'ejs')
    ;
});
server.build();
// tslint:disable-next-line:no-console
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
//


false && (async () => {
    const client = require('./classes/mongo');
    await client.connect();

    const {connector, deviceStates} = require('./classes/connector');

    // const model = new InMemoryModel();
    const oauth = new OAuth2Server({model});

    const _app = express();

    _app
        .use(json())
        .use(urlencoded({extended: false}))
        .use(express.static(join(__dirname, 'public')))
        .set('views', join(__dirname, 'views'))
        .set('view engine', 'ejs');

    _app
        .post('/st', async (req, res) => {
            if (accessTokenIsValid(req, res)) {
                await connector.handleHttpCallback(req, res)
            }
        })
        .post('/st/command', async (req, res) => {
            deviceStates[req.body.deviceId][req.body.attribute] = req.body.value;

            const collection = client.db().collection('CallbackAccessTokens');
            const tokens = await collection.find({}).toArray();

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

            res.send(true);
            res.end();
        })
        .get('/st/states', (req, res) => {
            res.json(deviceStates);
            res.end();
        });

    function accessTokenIsValid(req, res) {
        // Replace with proper validation of issued access token
        if (req.body.authentication && req.body.authentication.token) {
            console.log('accessTokenIsValid:', req.body);
            return true;
        }
        res.status(401).send('Unauthorized');
        return false;
    }

    _app
        .post('/token', (req, res, next) => {
            const request = new Request(req);
            const response = new Response(res);

            oauth.token(request, response)
                .then((token) => {
                    console.log(token);
                    model.dump();
                    next();
                })
                .catch((err) => {
                    console.error(err);
                    next(err);
                });
        })
        .get('/auth1', (req, res, next) => {
            const request = new Request(req);
            const response = new Response(res);

            oauth.authenticate(request, response)
                .then((token) => {
                    console.log(token);
                    model.dump();
                    next();
                })
                .catch((err) => {
                    console.error(err);
                    next(err);
                });
        })
        .get('/auth2', (req, res, next) => {
            const request = new Request(req);
            const response = new Response(res);

            oauth.authorize(request, response)
                .then((token) => {
                    console.log(token);
                    model.dump();
                    next();
                })
                .catch((err) => {
                    console.error(err);
                    next(err);
                });
        });

    _app.listen(PORT, () => console.log(`Listening on ${PORT}`));

})();
