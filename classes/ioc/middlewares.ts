import {NextFunction, Request, Response} from "express";
import {InMemoryModel} from "../model";
import OAuth2Server, {AuthorizeOptions} from "oauth2-server";

const OAuth2Request = OAuth2Server.Request;
const OAuth2Response = OAuth2Server.Response;

export function authorizeHandler(options?: AuthorizeOptions) {
    return (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const model: InMemoryModel = req.app.get('model');
            const oAuth2: OAuth2Server = req.app.get('oauth2');

            return oAuth2.authorize(new OAuth2Request(req), new OAuth2Response(res), options)
                .then((code) => {
                    console.log(1, code);
                    res.locals.oauth = {code};
                    next();
                })
                .catch((err) => {
                    console.error(err);
                    next(err);
                });
        } catch (err) {
            next(err);
        }
    }
}



