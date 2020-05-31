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
import OAuth2Server from "oauth2-server";
import {OAuth2Model} from "./classes/OAuth2Model";
import {wdProcess} from "./classes/watchDogService";

config();

const PORT = process.env.PORT || 5000

const container = new Container({defaultScope: "Singleton"});
container.load(buildProviderModule());

const app = express();
container.bind(TYPE.Application).toConstantValue(app);
app.set('ioc container', container);

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
            debug: app.get('env') === 'development' || true,
            log: true,
        }))
        .set('oauth2', new OAuth2Server({model: container.get<OAuth2Model>(TYPE.OAuth2Model)}))
        .set('views', join(__dirname, 'views'))
        .set('view engine', 'ejs')
        .set('last reset', new Date())
    ;
});
server.build();
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
wdProcess(app).catch(console.error);
