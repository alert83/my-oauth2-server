import {
    AuthorizationCode,
    AuthorizationCodeModel,
    Callback,
    Client,
    ClientCredentialsModel,
    ExtensionModel,
    Falsey,
    PasswordModel,
    RefreshToken,
    RefreshTokenModel,
    Token,
    User
} from "oauth2-server";

export class InMemoryModel implements AuthorizationCodeModel, ClientCredentialsModel, RefreshTokenModel, PasswordModel, ExtensionModel {
    tokens: (Token | RefreshToken)[];
    codes: AuthorizationCode[];
    clients: Client[];
    users: User | { password: string; id: string; username: string }[];

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
        } as Client];
        this.users = [{
            id: '3d4aa2c2-cd0d-4b3b-a650-db518d06e73c',
            username: 'user',
            password: 'pass',
        } as User];
    }

    dump() {
        console.log('clients', this.clients);
        console.log('tokens', this.tokens);
        console.log('codes', this.codes);
        console.log('users', this.users);
    };

    async getAccessToken(
        accessToken: string,
        callback?: Callback<Token>,
    ): Promise<Token | Falsey> {
        console.log('getAccessToken:', ...arguments);

        const tokens = this.tokens.filter((token) => token.accessToken === accessToken);
        return tokens[0] as Token ?? false;
    }

    async getRefreshToken(
        refreshToken: string,
        callback?: Callback<RefreshToken>,
    ): Promise<RefreshToken | Falsey> {
        console.log('getRefreshToken:', ...arguments);

        const tokens = this.tokens.filter(token => token.refreshToken === refreshToken);
        return tokens[0] as RefreshToken ?? false;
    }

    async saveToken(
        token: Token,
        client: Client,
        user: User,
        callback?: Callback<Token>,
    ): Promise<Token | Falsey> {
        console.log('saveToken:', ...arguments);

        const _token: Token = {
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

    async revokeToken(
        token: RefreshToken | Token,
        callback?: Callback<boolean>,
    ): Promise<boolean> {
        console.log('revokeToken:', ...arguments);

        this.tokens = this.tokens.filter((t) =>
            token.refreshToken ?
                t.refreshToken !== token.refreshToken :
                t.accessToken !== token.accessToken
        );
        return true;
    }

    //

    async getAuthorizationCode(
        authorizationCode: string,
        callback?: Callback<AuthorizationCode>,
    ): Promise<AuthorizationCode | Falsey> {
        console.log('getAuthorizationCode:', ...arguments);

        const codes = this.codes.filter(code => code.authorizationCode === authorizationCode);
        return codes[0] ?? false;
    }

    async saveAuthorizationCode(
        code: Pick<AuthorizationCode, "authorizationCode" | "expiresAt" | "redirectUri" | "scope">,
        client: Client,
        user: User,
        callback?: Callback<AuthorizationCode>,
    ): Promise<AuthorizationCode | Falsey> {
        console.log('saveAuthorizationCode:', ...arguments);

        const _code: AuthorizationCode = {
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

    async revokeAuthorizationCode(
        code: AuthorizationCode,
        callback?: Callback<boolean>,
    ): Promise<boolean> {
        console.log('revokeAuthorizationCode:', ...arguments);

        this.codes = this.codes.filter((c) =>
            c.authorizationCode !== code.authorizationCode
        );
        return true;
    }

    //

    async getClient(
        clientId: string,
        clientSecret: string,
        callback?: Callback<Client | Falsey>,
    ): Promise<Client | Falsey> {
        console.log('getClient:', ...arguments);

        const client = this.clients.filter(c =>
            c.clientId === clientId &&
            (c.clientSecret === clientSecret || !clientSecret)
        )[0];

        console.log(client);

        return client ?? false;
    }

    async getUser(
        username: string,
        password: string,
        callback?: Callback<User | Falsey>,
    ): Promise<User | Falsey> {
        console.log('getUser:', ...arguments);

        const users = this.users.filter(user =>
            user.username === username &&
            user.password === password
        );
        return users[0] ?? false;
    }

    async getUserFromClient(
        client: Client,
        callback?: Callback<User | Falsey>,
    ): Promise<User | Falsey> {
        console.log('getUserFromClient:', ...arguments);

        const users = this.users.filter(user =>
            user.id === client.userId
        );
        return users[0] ?? false;
    }

    async verifyScope(
        token: Token,
        scope: string | string[],
        callback?: Callback<boolean>,
    ): Promise<boolean> {
        console.log('verifyScope:', ...arguments);

        return true;
    }

}

