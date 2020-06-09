import {NextFunction, Request, Response} from "express";
import OAuth2Server, {AuthenticateOptions, AuthorizeOptions, TokenOptions} from "oauth2-server";
import {Container} from "inversify";
import {OAuth2Model} from "../OAuth2Model";
import {TYPE} from "./const";
import {stringify} from "querystring";

// const OAuth2Request = OAuth2Server.Request;
// const OAuth2Response = OAuth2Server.Response;

// Authenticates a request.
export function authenticateHandler(options?: AuthenticateOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
        // (async () => {
        //     const oauth2: OAuth2Server = req.app.get('oauth2');
        //     const token = await oauth2.authenticate(new OAuth2Request(req), new OAuth2Response(res), options);
        //     res.locals.oauth = {token};
        // })()
        //     .then(() => next())
        //     .catch(next);

        const oauth2: OAuth2Server = req.app.get('oauth2');
        oauth2.authenticate(req as any, res as any, options, next);
    }
}

// Authorizes a token request.
export function authorizeHandler(options?: AuthorizeOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
        // (async () => {
        //     const oauth2: OAuth2Server = req.app.get('oauth2');
        //     const code = await oauth2.authorize(new OAuth2Request(req), new OAuth2Response(res), options);
        //     res.locals.oauth = {code};
        // })()
        //     .then(() => next())
        //     .catch(next);

        const oAuth2Request = new OAuth2Server.Request({headers: {}, method: {}, query: {}});
        (oAuth2Request as any).req = req;
        const proxyReq = new Proxy<OAuth2Server.Request>(oAuth2Request, {
            get(target, p: PropertyKey, receiver: any): any {
                return (target as any).req[p];
            },
            set(target, p: PropertyKey, value: any, receiver: any): boolean {
                (target as any).req[p] = value;
                return true;
            },
        });

        const oAuth2Response = new OAuth2Server.Response({});
        (oAuth2Response as any).res = res;
        const proxyRes = new Proxy<OAuth2Server.Response>(oAuth2Response, {
            get(target, p: PropertyKey, receiver: any): any {
                return (target as any).res[p];
            },
            set(target, p: PropertyKey, value: any, receiver: any): boolean {
                (target as any).res[p] = value;
                return true;
            },
        });

        const oauth2: OAuth2Server = req.app.get('oauth2');
        oauth2.authorize(proxyReq, proxyRes, options, next);
    }
}

// Retrieves a new token for an authorized token request.
export function tokenHandler(options?: TokenOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
        // (async () => {
        //     const oauth2: OAuth2Server = req.app.get('oauth2');
        //     const token = await oauth2.token(new OAuth2Request(req), new OAuth2Response(res), options);
        //     res.locals.oauth = {token};
        // })()
        //     .then(() => next())
        //     .catch(next);

        const oauth2: OAuth2Server = req.app.get('oauth2');
        oauth2.token(req as any, res as any, options, next);
    }
}

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

        if (!token)
            return res.status(401).send("Access denied. No client token provided.").end();

        if (token !== process.env.AUTH_TOKEN)
            return res.status(400).send("Invalid client access token.").end();

        next();
    }
}


