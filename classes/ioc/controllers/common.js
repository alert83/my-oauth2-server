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
const OAuth2Request = oauth2_server_1.default.Request;
const OAuth2Response = oauth2_server_1.default.Response;
let Common = class Common extends inversify_express_utils_1.BaseHttpController {
    constructor(app) {
        super();
        this.app = app;
    }
    root(req, res) {
        console.log(req.params);
    }
    authorize(req, res) {
        res.send(true);
        res.end();
    }
    getLogin(req, res) {
        const client_id = req.query.client_id;
        const response_type = req.query.response_type;
        const redirect_uri = req.query.redirect_uri;
        const state = req.query.state;
        res.render('pages/login', { client_id, response_type, redirect_uri, state });
    }
    async postLogin(req, res) {
        console.log(req.body);
        const _request = new OAuth2Request(req);
        const _response = new OAuth2Response(res);
        const oAuth2 = this.app.get('oauth2');
        const token = await oAuth2.token(_request, _response);
        console.log(token);
    }
    async authenticate(req, res) {
        console.log(req.body);
        const _request = new OAuth2Request(req);
        const _response = new OAuth2Response(res);
        const oAuth2 = this.app.get('oauth2');
        const token = await oAuth2.authenticate(_request, _response);
        console.log(token);
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
    inversify_express_utils_1.httpGet('authorize', middlewares_1.authorizeHandler({
        authenticateHandler: {
            handle: (_request, _response) => {
                return false;
            }
        }
    })),
    __param(0, inversify_express_utils_1.request()),
    __param(1, inversify_express_utils_1.response()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], Common.prototype, "authorize", null);
__decorate([
    inversify_express_utils_1.httpGet('login'),
    __param(0, inversify_express_utils_1.request()),
    __param(1, inversify_express_utils_1.response()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], Common.prototype, "getLogin", null);
__decorate([
    inversify_express_utils_1.httpPost('login'),
    __param(0, inversify_express_utils_1.request()),
    __param(1, inversify_express_utils_1.response()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], Common.prototype, "postLogin", null);
__decorate([
    inversify_express_utils_1.httpPost('authenticate'),
    __param(0, inversify_express_utils_1.request()),
    __param(1, inversify_express_utils_1.response()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], Common.prototype, "authenticate", null);
Common = __decorate([
    inversify_express_utils_1.controller('/'),
    __param(0, inversify_1.inject(const_1.TYPE.Application)),
    __metadata("design:paramtypes", [Function])
], Common);
