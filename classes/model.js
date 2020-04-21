"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class InMemoryModel {
    constructor() {
        this.tokens = [];
        this.codes = [];
        this.clients = [{
                id: 'b35f88cf-2220-472a-86a6-e502d4d0cf1b',
                redirectUris: [''],
                grants: [
                    'authorization_code',
                    'client_credentials',
                    'refresh_token',
                    'password',
                ],
                clientId: 'client',
                clientSecret: 'secret',
                userId: '3d4aa2c2-cd0d-4b3b-a650-db518d06e73c',
            }];
        this.users = [{
                id: '3d4aa2c2-cd0d-4b3b-a650-db518d06e73c',
                username: 'user',
                password: 'pass',
            }];
    }
    dump() {
        console.log('clients', this.clients);
        console.log('tokens', this.tokens);
        console.log('codes', this.codes);
        console.log('users', this.users);
    }
    ;
    async getAccessToken(accessToken, callback) {
        var _a;
        console.log('getAccessToken:', ...arguments);
        const tokens = this.tokens.filter((token) => token.accessToken === accessToken);
        return (_a = tokens[0]) !== null && _a !== void 0 ? _a : false;
    }
    async getRefreshToken(refreshToken, callback) {
        var _a;
        console.log('getRefreshToken:', ...arguments);
        const tokens = this.tokens.filter(token => token.refreshToken === refreshToken);
        return (_a = tokens[0]) !== null && _a !== void 0 ? _a : false;
    }
    async saveToken(token, client, user, callback) {
        console.log('saveToken:', ...arguments);
        const _token = {
            accessToken: token.accessToken,
            accessTokenExpiresAt: token.accessTokenExpiresAt,
            refreshToken: token.refreshToken,
            refreshTokenExpiresAt: token.refreshTokenExpiresAt,
            scope: token.scope,
            clientId: client.clientId,
            client,
            userId: user.id,
            user,
        };
        this.tokens.push(_token);
        return _token;
    }
    async revokeToken(token, callback) {
        console.log('revokeToken:', ...arguments);
        this.tokens = this.tokens.filter((t) => token.refreshToken ?
            t.refreshToken !== token.refreshToken :
            t.accessToken !== token.accessToken);
        return true;
    }
    async getAuthorizationCode(authorizationCode, callback) {
        var _a;
        console.log('getAuthorizationCode:', ...arguments);
        const codes = this.codes.filter(code => code.authorizationCode === authorizationCode);
        return (_a = codes[0]) !== null && _a !== void 0 ? _a : false;
    }
    async saveAuthorizationCode(code, client, user, callback) {
        console.log('saveAuthorizationCode:', ...arguments);
        const _code = {
            authorizationCode: code.authorizationCode,
            expiresAt: code.expiresAt,
            redirectUri: code.redirectUri,
            scope: code.scope,
            clientId: client.clientId,
            client,
            userId: user.id,
            user,
        };
        this.codes.push(_code);
        return _code;
    }
    async revokeAuthorizationCode(code, callback) {
        console.log('revokeAuthorizationCode:', ...arguments);
        this.codes = this.codes.filter((c) => c.authorizationCode !== code.authorizationCode);
        return true;
    }
    async getClient(clientId, clientSecret, callback) {
        console.log('getClient:', ...arguments);
        const client = this.clients.filter(c => c.clientId === clientId &&
            (c.clientSecret === clientSecret || !clientSecret))[0];
        console.log(client);
        return client !== null && client !== void 0 ? client : false;
    }
    async getUser(username, password, callback) {
        var _a;
        console.log('getUser:', ...arguments);
        const users = this.users.filter(user => user.username === username &&
            user.password === password);
        return (_a = users[0]) !== null && _a !== void 0 ? _a : false;
    }
    async getUserFromClient(client, callback) {
        var _a;
        console.log('getUserFromClient:', ...arguments);
        const users = this.users.filter(user => user.id === client.userId);
        return (_a = users[0]) !== null && _a !== void 0 ? _a : false;
    }
    async verifyScope(token, scope, callback) {
        console.log('verifyScope:', ...arguments);
        return true;
    }
}
exports.InMemoryModel = InMemoryModel;
