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
var OAuth2Model_1;
Object.defineProperty(exports, "__esModule", { value: true });
const ioc_1 = require("./ioc/ioc");
const const_1 = require("./ioc/const");
const inversify_1 = require("inversify");
const mongoService_1 = require("./mongoService");
const crypto_1 = require("crypto");
let OAuth2Model = OAuth2Model_1 = class OAuth2Model {
    constructor(app, client) {
        this.app = app;
        this.client = client;
    }
    async cbAndPromise(fn, callback) {
        return await this.client.withClient(async (db) => {
            const res = await fn(db);
            callback && callback(null, res);
            return res;
        })
            .catch((err) => {
            if (callback)
                callback(err);
            else
                throw err;
        });
    }
    static genRandomString(length) {
        return crypto_1.randomBytes(Math.ceil(length / 2))
            .toString('hex')
            .slice(0, length);
    }
    ;
    static sha512(password, salt) {
        const hash = crypto_1.createHmac('sha512', salt);
        hash.update(password);
        const value = hash.digest('hex');
        return {
            salt,
            passwordHash: value
        };
    }
    ;
    static saltHashPassword(userpassword) {
        var _a;
        const salt = (_a = process.env.SALT) !== null && _a !== void 0 ? _a : this.genRandomString(16);
        const passwordData = this.sha512(userpassword, salt);
        return passwordData;
    }
    async getAuthorizationCode(authorizationCode, callback) {
        return this.cbAndPromise(async (db) => {
            const coll = db.collection('my-oauth2-codes');
            const code = await coll.findOne({ authorizationCode });
            return code !== null && code !== void 0 ? code : undefined;
        }, callback);
    }
    async saveAuthorizationCode(code, client, user, callback) {
        return this.cbAndPromise(async (db) => {
            const _code = Object.assign(Object.assign({}, code), { client, clientId: client._id, user, userId: user._id });
            const coll = db.collection('my-oauth2-codes');
            await coll.findOneAndReplace({ authorizationCode: _code.authorizationCode }, _code, { upsert: true });
            return _code !== null && _code !== void 0 ? _code : undefined;
        }, callback);
    }
    async revokeAuthorizationCode(code, callback) {
        return this.cbAndPromise(async (db) => {
            const coll = db.collection('my-oauth2-codes');
            await coll.deleteMany({ authorizationCode: code.authorizationCode });
            return true;
        }, callback);
    }
    async getAccessToken(accessToken, callback) {
        return this.cbAndPromise(async (db) => {
            const coll = db.collection('my-oauth2-tokens');
            const token = await coll.findOne({ accessToken });
            return token !== null && token !== void 0 ? token : undefined;
        }, callback);
    }
    async getRefreshToken(refreshToken, callback) {
        return this.cbAndPromise(async (db) => {
            const coll = db.collection('my-oauth2-tokens');
            const token = await coll.findOne({ refreshToken });
            return token !== null && token !== void 0 ? token : undefined;
        }, callback);
    }
    async saveToken(token, client, user, callback) {
        return this.cbAndPromise(async (db) => {
            const _token = Object.assign(Object.assign({}, token), { client, clientId: client._id, user, userId: user._id });
            const coll = db.collection('my-oauth2-tokens');
            await coll.findOneAndReplace(_token.accessToken ?
                { accessToken: _token.accessToken } :
                { refreshToken: _token.refreshToken }, _token, { upsert: true });
            return _token !== null && _token !== void 0 ? _token : undefined;
        }, callback);
    }
    async revokeToken(token, callback) {
        return this.cbAndPromise(async (db) => {
            const coll = db.collection('my-oauth2-tokens');
            await coll.deleteMany(token.accessToken ?
                { accessToken: token.accessToken } :
                { refreshToken: token.refreshToken });
            return true;
        }, callback);
    }
    async getClient(clientId, clientSecret, callback) {
        return this.cbAndPromise(async (db) => {
            const coll = db.collection('my-clients');
            const client = await coll.findOne(clientSecret ? { clientId, clientSecret } : { clientId }, { projection: { clientSecret1: false } });
            return client !== null && client !== void 0 ? client : undefined;
        }, callback);
    }
    async getUser(username, password, callback) {
        return this.cbAndPromise(async (db) => {
            const coll = db.collection('my-users');
            const data = OAuth2Model_1.saltHashPassword(password);
            const user = await coll.findOne({ username, hash: data.passwordHash }, { projection: { hash1: false } });
            return user !== null && user !== void 0 ? user : undefined;
        }, callback);
    }
    async getUserFromClient(client, callback) {
        return this.cbAndPromise(async (db) => {
            const coll = db.collection('my-users');
            const user = await coll.findOne({ clientId: client.id }, { projection: { hash1: false } });
            return user !== null && user !== void 0 ? user : undefined;
        }, callback);
    }
    async verifyScope(token, scope, callback) {
        return this.cbAndPromise(async (db) => {
            return true;
        }, callback);
    }
};
OAuth2Model = OAuth2Model_1 = __decorate([
    ioc_1.provideIf(const_1.TYPE.OAuth2Model, true),
    __param(0, inversify_1.inject(const_1.TYPE.Application)),
    __param(1, inversify_1.inject(const_1.TYPE.MongoDBClient)),
    __metadata("design:paramtypes", [Function, mongoService_1.MongoService])
], OAuth2Model);
exports.OAuth2Model = OAuth2Model;
