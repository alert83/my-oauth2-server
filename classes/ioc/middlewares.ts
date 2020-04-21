import {NextFunction, Request, Response} from "express";
import OAuth2Server, {AuthenticateOptions, AuthorizeOptions, TokenOptions} from "oauth2-server";
import {Container} from "inversify";
import {OAuth2Model} from "../OAuth2Model";
import {TYPE} from "./const";

const OAuth2Request = OAuth2Server.Request;
const OAuth2Response = OAuth2Server.Response;

export function authorizeHandler(options?: AuthorizeOptions) {
    return (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {
        const oAuth2: OAuth2Server = req.app.get('oauth2');

        return oAuth2.authorize(new OAuth2Request(req), new OAuth2Response(res), options)
            .then((code) => {
                res.locals.oauth = {code};
                next();
            })
            .catch(next);
    }
}

export function authenticateHandler(options?: AuthenticateOptions) {
    return (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {
        const oAuth2: OAuth2Server = req.app.get('oauth2');

        return oAuth2.authenticate(new OAuth2Request(req), new OAuth2Response(res), options)
            .then((token) => {
                res.locals.oauth = {token};
                next();
            })
            .catch(next);
    }
}

export function tokenHandler(options?: TokenOptions) {
    return (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {
        const oAuth2: OAuth2Server = req.app.get('oauth2');

        return oAuth2.token(new OAuth2Request(req), new OAuth2Response(res), options)
            .then((token) => {
                res.locals.oauth = {token};
                next();
            })
            .catch(next);
    }
}

export function loginHandler() {
    return async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const container: Container = req.app.get('ioc container');
            const model = container.get<OAuth2Model>(TYPE.OAuth2Model);
            const user = await model.getUser(req.query.username as string, req.query.password as string);
            (req as any).session.user = user;
            next();
        } catch (err) {
            next(err);
        }
    }
}



