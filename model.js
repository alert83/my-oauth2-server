/**
 * Constructor.
 */

class InMemoryCache {

    constructor() {
        this.clients = [{
            clientId: 'client',
            clientSecret: 'secret',
            id: 'b35f88cf-2220-472a-86a6-e502d4d0cf1b',
            redirectUris: [''],
            grants: [
                'authorization_code',
                'client_credentials',
                'refresh_token',
                'password',
            ],
            userId: '3d4aa2c2-cd0d-4b3b-a650-db518d06e73c',
        }];
        this.tokens = [];
        this.codes = [];
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
    };

    getAccessToken(bearerToken) {
        var tokens = this.tokens.filter(function (token) {
            return token.accessToken === bearerToken;
        });

        return tokens.length ? tokens[0] : false;
    };

    getRefreshToken(bearerToken) {
        var tokens = this.tokens.filter(function (token) {
            return token.refreshToken === bearerToken;
        });

        return tokens.length ? tokens[0] : false;
    };

    getClient(clientId, clientSecret) {
        var clients = this.clients.filter(function (client) {
            return client.clientId === clientId && client.clientSecret === clientSecret;
        });

        return clients.length ? clients[0] : false;
    };

    saveToken(token, client, user) {
        this.tokens.push({
            accessToken: token.accessToken,
            accessTokenExpiresAt: token.accessTokenExpiresAt,
            refreshToken: token.refreshToken,
            refreshTokenExpiresAt: token.refreshTokenExpiresAt,
            scope: token.scope,

            clientId: client.clientId,
            client: client,

            userId: user.id,
            user: user,
        });
    };

    revokeToken(token) {
        this.tokens = this.tokens.filter((t) => t.refreshToken !== token.refreshToken);
    }

    getUser(username, password) {
        var users = this.users.filter(function (user) {
            return user.username === username && user.password === password;
        });

        return users.length ? users[0] : false;
    };

    getUserFromClient(client) {
        var users = this.users.filter(function (user) {
            return user.id === client.userId;
        });

        return users.length ? users[0] : false;
    };

    getAuthorizationCode(authorizationCode) {
        var codes = this.codes.filter(function (code) {
            return code.authorizationCode === authorizationCode;
        });

        return codes.length ? codes[0] : false;
    }

    saveAuthorizationCode(code, client, user) {
        this.codes.push({
            authorizationCode: code.authorizationCode,
            expiresAt: code.expiresAt,
            redirectUri: code.redirectUri,
            scope: code.scope,

            clientId: client.clientId,
            client: client,

            userId: user.id,
            user: user,

        });
    }

    revokeAuthorizationCode(code) {
        this.codes = this.codes.filter((c) => c.authorizationCode !== code.authorizationCode);
    }
}

/**
 * Export constructor.
 */

module.exports = InMemoryCache;
