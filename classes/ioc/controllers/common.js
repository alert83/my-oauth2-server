"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const inversify_1 = require("inversify");
const inversify_express_utils_1 = require("inversify-express-utils");
const const_1 = require("../const");
const oauth2_server_1 = __importDefault(require("oauth2-server"));
const middlewares_1 = require("../middlewares");
const OAuth2Model_1 = require("../../OAuth2Model");
const OAuth2Request = oauth2_server_1.default.Request;
const OAuth2Response = oauth2_server_1.default.Response;
let Common = class Common extends inversify_express_utils_1.BaseHttpController {
    constructor(app, model) {
        super();
        this.app = app;
        this.model = model;
    }
    root(req, res) {
        console.log(req.params);
    }
    getAuth(req, res) {
        const client_id = req.query.client_id;
        const response_type = req.query.response_type;
        const redirect_uri = req.query.redirect_uri;
        const state = req.query.state;
        res.render('pages/login', { client_id, response_type, redirect_uri, state });
    }
    async postAuth(req, res) {
        var _a, _b;
        const code = (_b = (_a = res.locals) === null || _a === void 0 ? void 0 : _a.oauth) === null || _b === void 0 ? void 0 : _b.code;
        const state = req.body.state;
        let location = `${code.redirectUri}${code.redirectUri.includes('?') ? '&' : '?'}code=${code.authorizationCode}`;
        if (state)
            location += "&state=" + state;
        res.writeHead(307, { "Location": location });
        res.end();
    }
    async token(req, res) {
        res.send(res.locals.oauth.token);
        res.end();
    }
};
__decorate([
    inversify_express_utils_1.httpGet(''),
    __param(0, inversify_express_utils_1.request()),
    __param(1, inversify_express_utils_1.response()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], Common.prototype, "root", null);
__decorate([
    inversify_express_utils_1.httpGet('auth'),
    __param(0, inversify_express_utils_1.request()),
    __param(1, inversify_express_utils_1.response()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], Common.prototype, "getAuth", null);
__decorate([
    inversify_express_utils_1.httpPost('auth', async (req, res, next) => {
        try {
            const container = req.app.get('ioc container');
            const model = container.get(const_1.TYPE.OAuth2Model);
            const user = await model.getUser(req.body.username, req.body.password);
            req.session.user = user;
            next();
        }
        catch (err) {
            next(err);
        }
    }, middlewares_1.authorizeHandler({ authenticateHandler: { handle: (req, res) => req.session.user } })),
    __param(0, inversify_express_utils_1.request()),
    __param(1, inversify_express_utils_1.response()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], Common.prototype, "postAuth", null);
__decorate([
    inversify_express_utils_1.httpPost('token', middlewares_1.tokenHandler()),
    __param(0, inversify_express_utils_1.request()),
    __param(1, inversify_express_utils_1.response()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], Common.prototype, "token", null);
Common = __decorate([
    inversify_express_utils_1.controller('/'),
    __param(0, inversify_1.inject(const_1.TYPE.Application)),
    __param(1, inversify_1.inject(const_1.TYPE.OAuth2Model)),
    __metadata("design:paramtypes", [Function, OAuth2Model_1.OAuth2Model])
], Common);
