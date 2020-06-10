import {NextFunction, Request, Response} from "express";
import OAuth2Server, {AuthenticateOptions, AuthorizeOptions, TokenOptions} from "oauth2-server";
import {Container} from "inversify";
import {OAuth2Model} from "../OAuth2Model";
import {TYPE} from "./const";
import {stringify} from "querystring";
import jwks from "jwks-rsa";
import jwt from "express-jwt";

// const OAuth2Request = OAuth2Server.Request;
// const OAuth2Response = OAuth2Server.Response;

function wrapRequest(req: Request) {
    const oAuth2Request = new OAuth2Server.Request({headers: {}, method: {}, query: {}});
    (oAuth2Request as any).req = req;
    return new Proxy<OAuth2Server.Request>(oAuth2Request, {
        get(target, p: PropertyKey, receiver: any): any {
            return (target as any).req[p];
        },
        set(target, p: PropertyKey, value: any, receiver: any): boolean {
            (target as any).req[p] = value;
            return true;
        },
    });
}

function wrapResponse(res: Response) {
    const oAuth2Response = new OAuth2Server.Response({});
    (oAuth2Response as any).res = res;
    return new Proxy<OAuth2Server.Response>(oAuth2Response, {
        get(target, p: PropertyKey, receiver: any): any {
            if (p === 'body')
                return (target as any).res.locals.body;
            else
                return (target as any).res[p];
        },
        set(target, p: PropertyKey, value: any, receiver: any): boolean {
            if (p === 'body')
                (target as any).res.locals.body = value;
            else
                (target as any).res[p] = value;

            return true;
        },
    });
}


// Authenticates a request.
export function authenticateHandler(options?: AuthenticateOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
        // (async () => {
        //     const oauth2: OAuth2Server = req.app.get('oauth2');
        //     const token = await oauth2.authenticate(wrapRequest(req), wrapResponse(res), options);
        //     res.locals.oauth = {token};
        // })()
        //     .then(() => next())
        //     .catch(next);

        const oauth2: OAuth2Server = req.app.get('oauth2');
        oauth2.authenticate(wrapRequest(req), wrapResponse(res), options, (err) => {
            if (err && err.code) {
                return res.status(err.code).send({
                    headers: {
                        ...req.body.headers,
                        interactionType: 'interactionResult',
                    },
                    authentication: req.body.authentication,
                });
            }

            if (err) return next(err);
            next();
        });
    }
}

// Authorizes a token request.
export function authorizeHandler(options?: AuthorizeOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
        // (async () => {
        //     const oauth2: OAuth2Server = req.app.get('oauth2');
        //     const code = await oauth2.authorize(wrapRequest(req), wrapResponse(res), options);
        //     res.locals.oauth = {code};
        // })()
        //     .then(() => next())
        //     .catch(next);

        const oauth2: OAuth2Server = req.app.get('oauth2');
        oauth2.authorize(wrapRequest(req), wrapResponse(res), options, next);
    }
}

// Retrieves a new token for an authorized token request.
export function tokenHandler(options?: TokenOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
        // (async () => {
        //     console.log('tokenHandler:', req.params, req.query, req.body);
        //
        //     const oauth2: OAuth2Server = req.app.get('oauth2');
        //     const token = await oauth2.token(wrapRequest(req), wrapResponse(res), options);
        //     res.locals.oauth = {token};
        // })()
        //     .then(() => next())
        //     .catch(next);

        console.log('tokenHandler:', req.params, req.query, req.body);

        const oauth2: OAuth2Server = req.app.get('oauth2');
        oauth2.token(wrapRequest(req), wrapResponse(res), options, next);
    }
}

//

export function checkSessionUserHandler() {
    return (req: Request, res: Response, next: NextFunction) => {
        (async () => {
            if (!req.session?.user) {
                return res.redirect('/oauth2/login?' +
                    stringify({...req.query, ...req.body}));
            } else {
                next();
            }
        })()
            .catch(next);
    }
}

export function loginHandler() {
    return (req: Request, res: Response, next: NextFunction) => {
        (async () => {
            const container: Container = req.app.get('ioc container');
            const model = container.get<OAuth2Model>(TYPE.OAuth2Model);

            const user = await model.getUser(
                req.body.username as string,
                req.body.password as string,
            );

            if (user && req.session) {
                req.session.user = user;
                next();
            } else {
                // tslint:disable-next-line:variable-name
                const err_msg = "Invalid username or password.";

                return res.redirect(301, '/oauth2/login?' +
                    stringify({...req.query, ...req.body, err_msg}));
            }
        })()
            .catch(next);
    }
}


export function xAuthIsValid() {
    return (req: Request, res: Response, next: NextFunction) => {
        const token = req.header('x-authorization');

        if (!token) {
            console.log("headers:", req.headers);
            return res.status(401).send("Access denied. No client token provided.").end();
        }

        if (token !== process.env.AUTH_TOKEN)
            return res.status(400).send("Invalid client access token.").end();

        next();
    }
}

//

export function auth0Protected() {
    return jwt({
        secret: jwks.expressJwtSecret({
            cache: true,
            rateLimit: true,
            jwksRequestsPerMinute: 5,
            jwksUri: 'https://alert.auth0.com/.well-known/jwks.json'
        }),
        audience: 'https://my-oauth2-server.herokuapp.com/st',
        issuer: 'https://alert.auth0.com/',
        algorithms: ['RS256'],
        getToken: req => {
            if (!req.headers?.authorization && req.body?.authentication) {
                return req.body?.authentication?.token;
            }

            if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
                return req.headers.authorization.split(' ')[1];
            } else if (req.query && req.query.token) {
                return req.query.token;
            }

            return null;
        }
    }).unless({path: ['/command']})
}


