import 'reflect-metadata';
import {config} from "dotenv";
//
import {Container} from "inversify";
import {buildProviderModule} from "inversify-binding-decorators";
import {InversifyExpressServer} from "inversify-express-utils";
import express from "express";
import session from "express-session";
import errorHandler from "strong-error-handler";
import {json, urlencoded} from "body-parser";
import {join} from "path";
import OAuth2Server from "oauth2-server";
//
// load all injectable entities.
// the @provide() annotation will then automatically register them.
import './classes/ioc/loader';
import {TYPE} from "./classes/ioc/const";
//
import {OAuth2Model} from "./classes/OAuth2Model";
import {WatchDogService} from "./classes/watchDogService";
import {isDev, isProd} from "./classes/utils";

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
            debug: isDev(app),
            log: true,
        }))
        .set('oauth2', new OAuth2Server({
            model: container.get<OAuth2Model>(TYPE.OAuth2Model),
            authorizationCodeLifetime: isProd() ? Number(process.env.CODE_LIFETIME ?? 5 * 60) : 5,
            accessTokenLifetime: isProd() ? Number(process.env.ACCESS_TOKEN_LIFETIME ?? 2 * 60 * 60) : 5,
            refreshTokenLifetime: isProd() ? Number(process.env.REFRESH_TOKEN_LIFETIME ?? 14 * 24 * 60 * 60) : 5,
        }))
        .set('views', join(__dirname, 'views'))
        .set('view engine', 'ejs')
    ;
});
server.build();
app.listen(PORT, () => {
    console.log(`Listening on ${PORT}`);
    console.log(`env:`, process.env.NODE_ENV);

    if (isProd()) {
        const wd = container.get<WatchDogService>(TYPE.WatchDogService);
        wd.process();
    }
});
