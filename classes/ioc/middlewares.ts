import {NextFunction, Request, Response} from "express";
import OAuth2Server, {AuthenticateOptions, AuthorizeOptions, TokenOptions} from "oauth2-server";
import {Container} from "inversify";
import {OAuth2Model} from "../OAuth2Model";
import {TYPE} from "./const";
import {stringify} from "querystring";

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
        (async () => {
            console.log('authenticateHandler:', req.headers, req.params, req.query, req.body);

            if (!req.headers.authorization && req.body?.authentication) {
                req.headers.authorization =
                    `${req.body?.authentication?.tokenType} ${req.body?.authentication?.token}`
            }

            const oauth2: OAuth2Server = req.app.get('oauth2');
            const token = await oauth2.authenticate(wrapRequest(req), wrapResponse(res), options);
            res.locals.oauth = {token};
        })()
            .then(() => next())
            .catch(next);
    }
}

// Authorizes a token request.
export function authorizeHandler(options?: AuthorizeOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
        (async () => {
            const oauth2: OAuth2Server = req.app.get('oauth2');
            const code = await oauth2.authorize(wrapRequest(req), wrapResponse(res), options);
            res.locals.oauth = {code};
        })()
            .then(() => next())
            .catch(next);
    }
}

// Retrieves a new token for an authorized token request.
export function tokenHandler(options?: TokenOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
        (async () => {
            console.log('tokenHandler:', req.params, req.query, req.body);

            const oauth2: OAuth2Server = req.app.get('oauth2');
            const token = await oauth2.token(wrapRequest(req), wrapResponse(res), options);
            res.locals.oauth = {token};
        })()
            .then(() => next())
            .catch(next);
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

        if (!token)
            return res.status(401).send("Access denied. No client token provided.").end();

        if (token !== process.env.AUTH_TOKEN)
            return res.status(400).send("Invalid client access token.").end();

        next();
    }
}


