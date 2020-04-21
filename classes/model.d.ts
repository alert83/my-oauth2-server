import { AuthorizationCode, AuthorizationCodeModel, Callback, Client, ClientCredentialsModel, ExtensionModel, Falsey, PasswordModel, RefreshToken, RefreshTokenModel, Token, User } from "oauth2-server";
export declare class InMemoryModel implements AuthorizationCodeModel, ClientCredentialsModel, RefreshTokenModel, PasswordModel, ExtensionModel {
    tokens: (Token | RefreshToken)[];
    codes: AuthorizationCode[];
    clients: Client[];
    users: User | {
        password: string;
        id: string;
        username: string;
    }[];
    constructor();
    dump(): void;
    getAccessToken(accessToken: string, callback?: Callback<Token>): Promise<Token | Falsey>;
    getRefreshToken(refreshToken: string, callback?: Callback<RefreshToken>): Promise<RefreshToken | Falsey>;
    saveToken(token: Token, client: Client, user: User, callback?: Callback<Token>): Promise<Token | Falsey>;
    revokeToken(token: RefreshToken | Token, callback?: Callback<boolean>): Promise<boolean>;
    getAuthorizationCode(authorizationCode: string, callback?: Callback<AuthorizationCode>): Promise<AuthorizationCode | Falsey>;
    saveAuthorizationCode(code: Pick<AuthorizationCode, "authorizationCode" | "expiresAt" | "redirectUri" | "scope">, client: Client, user: User, callback?: Callback<AuthorizationCode>): Promise<AuthorizationCode | Falsey>;
    revokeAuthorizationCode(code: AuthorizationCode, callback?: Callback<boolean>): Promise<boolean>;
    getClient(clientId: string, clientSecret: string, callback?: Callback<Client | Falsey>): Promise<Client | Falsey>;
    getUser(username: string, password: string, callback?: Callback<User | Falsey>): Promise<User | Falsey>;
    getUserFromClient(client: Client, callback?: Callback<User | Falsey>): Promise<User | Falsey>;
    verifyScope(token: Token, scope: string | string[], callback?: Callback<boolean>): Promise<boolean>;
}
