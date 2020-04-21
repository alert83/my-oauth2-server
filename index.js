"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv_1 = require("dotenv");
const inversify_1 = require("inversify");
const inversify_binding_decorators_1 = require("inversify-binding-decorators");
const inversify_express_utils_1 = require("inversify-express-utils");
const const_1 = require("./classes/ioc/const");
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const strong_error_handler_1 = __importDefault(require("strong-error-handler"));
const body_parser_1 = require("body-parser");
const path_1 = require("path");
require("./classes/ioc/loader");
const st_schema_1 = require("st-schema");
const oauth2_server_1 = __importDefault(require("oauth2-server"));
dotenv_1.config();
const PORT = process.env.PORT || 5000;
const container = new inversify_1.Container();
container.load(inversify_binding_decorators_1.buildProviderModule());
const app = express_1.default();
container.bind(const_1.TYPE.Application).toConstantValue(app);
app.set('ioc container', container);
const server = new inversify_express_utils_1.InversifyExpressServer(container, null, null, app);
server.setConfig((_app) => {
    _app
        .use(express_session_1.default({
        secret: "38240a30-5ed7-41f2-981c-4a9603f332f2",
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
    }))
        .use(body_parser_1.json())
        .use(body_parser_1.urlencoded({ extended: false }))
        .use(express_1.default.static(path_1.join(__dirname, 'public')))
        .use(strong_error_handler_1.default({
        debug: app.get('env') === 'development',
        log: true,
    }))
        .set('oauth2', new oauth2_server_1.default({ model: container.get(const_1.TYPE.OAuth2Model) }))
        .set('views', path_1.join(__dirname, 'views'))
        .set('view engine', 'ejs');
});
server.build();
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
false && (async () => {
    const client = require('./classes/mongo');
    await client.connect();
    const { connector, deviceStates } = require('./classes/connector');
    const _app = express_1.default();
    _app
        .post('/st', async (req, res) => {
        await connector.handleHttpCallback(req, res);
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
            const stateUpdateRequest = new st_schema_1.StateUpdateRequest(process.env.ST_CLIENT_ID, process.env.ST_CLIENT_SECRET);
            console.log('stateUpdateRequest:', token);
            await stateUpdateRequest.updateState(token.callbackUrls, token.callbackAuthentication, deviceState);
        }
        res.send(true);
        res.end();
    })
        .get('/st/states', (req, res) => {
        res.json(deviceStates);
        res.end();
    });
})();
