import {NextFunction, Request, Response} from "express";
import OAuth2Server, {AuthenticateOptions, AuthorizeOptions, TokenOptions} from "oauth2-server";
import {Container} from "inversify";
import {OAuth2Model} from "../OAuth2Model";
import {TYPE} from "./const";
import {format} from "util";

const OAuth2Request = OAuth2Server.Request;
const OAuth2Response = OAuth2Server.Response;

// Authenticates a request.
export function authenticateHandler(options?: AuthenticateOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
        (async () => {
            const oauth2: OAuth2Server = req.app.get('oauth2');
            const token = oauth2.authenticate(new OAuth2Request(req), new OAuth2Response(res), options);
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
            const code = oauth2.authorize(new OAuth2Request(req), new OAuth2Response(res), options);
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
            const oauth2: OAuth2Server = req.app.get('oauth2');
            const token = oauth2.token(new OAuth2Request(req), new OAuth2Response(res), options);
            res.locals.oauth = {token};
        })()
            .then(() => next())
            .catch(next);
    }
}

export function checkSessionUserHandler() {
    return (req: Request, res: Response, next: NextFunction) => {
        (async () => {
            if (!req.session?.user) {
                // tslint:disable-next-line:variable-name
                const client_id = req.query.client_id ?? req.body.client_id;
                // tslint:disable-next-line:variable-name
                const response_type = req.query.response_type ?? req.body.response_type;
                // tslint:disable-next-line:variable-name
                const redirect_uri = req.query.redirect_uri ?? req.body.redirect_uri;
                const state = req.query.state ?? req.body.state;

                return res.redirect(format(
                    '/oauth2/login?' + [
                        'client_id', 'response_type', 'redirect_uri', 'state'
                    ].map((itm) => itm + '=%s').join('&'),
                    client_id, response_type, redirect_uri, state,
                ));
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
                const client_id = req.query.client_id ?? req.body.client_id;
                // tslint:disable-next-line:variable-name
                const response_type = req.query.response_type ?? req.body.response_type;
                // tslint:disable-next-line:variable-name
                const redirect_uri = req.query.redirect_uri ?? req.body.redirect_uri;
                // tslint:disable-next-line:variable-name
                const state = req.query.state ?? req.body.state;
                // tslint:disable-next-line:variable-name
                const err_msg = "Invalid username or password.";

                return res.redirect(400, format(
                    '/oauth2/login?' + [
                        'client_id', 'response_type', 'redirect_uri', 'state', 'err_msg'
                    ].map((itm) => itm + '=%s').join('&'),
                    client_id, response_type, redirect_uri, state, err_msg,
                ));
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


