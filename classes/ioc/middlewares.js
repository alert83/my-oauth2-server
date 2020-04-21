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
        try {
            const model = req.app.get('model');
            const oAuth2 = req.app.get('oauth2');
            return oAuth2.authorize(new OAuth2Request(req), new OAuth2Response(res), options)
                .then((code) => {
                console.log(1, code);
                res.locals.oauth = { code };
                next();
            })
                .catch((err) => {
                console.error(err);
                next(err);
            });
        }
        catch (err) {
            next(err);
        }
    };
}
exports.authorizeHandler = authorizeHandler;
