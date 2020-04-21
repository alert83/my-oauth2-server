import {NextFunction, Request, Response} from "express";
import OAuth2Server, {AuthenticateOptions, AuthorizeOptions} from "oauth2-server";

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



