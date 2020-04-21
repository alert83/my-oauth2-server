"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const oauth2_server_1 = __importDefault(require("oauth2-server"));
const OAuth2Request = oauth2_server_1.default.Request;
const OAuth2Response = oauth2_server_1.default.Response;
function authorizeHandler(options) {
    return (req, res, next) => {
        const oAuth2 = req.app.get('oauth2');
        return oAuth2.authorize(new OAuth2Request(req), new OAuth2Response(res), options)
            .then((code) => {
            res.locals.oauth = { code };
            next();
        })
            .catch(next);
    };
}
exports.authorizeHandler = authorizeHandler;
function authenticateHandler(options) {
    return (req, res, next) => {
        const oAuth2 = req.app.get('oauth2');
        return oAuth2.authenticate(new OAuth2Request(req), new OAuth2Response(res), options)
            .then((token) => {
            res.locals.oauth = { token };
            next();
        })
            .catch(next);
    };
}
exports.authenticateHandler = authenticateHandler;
function tokenHandler(options) {
    return (req, res, next) => {
        const oAuth2 = req.app.get('oauth2');
        return oAuth2.token(new OAuth2Request(req), new OAuth2Response(res), options)
            .then((token) => {
            res.locals.oauth = { token };
            next();
        })
            .catch(next);
    };
}
exports.tokenHandler = tokenHandler;
