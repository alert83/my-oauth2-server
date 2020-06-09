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
import {provideIf} from "./ioc/ioc";
import {TYPE} from "./ioc/const";
import {inject} from "inversify";
import {Express} from "express";
import {MongoService} from "./mongoService";
import {Db, ObjectId} from "mongodb";
import {createHmac, randomBytes} from "crypto";

type MongoAuthorizationCode = Pick<AuthorizationCode, "authorizationCode" | "expiresAt" | "redirectUri" | "scope" | 'clientId' | 'userId'>;

@provideIf(TYPE.OAuth2Model, true)
export class OAuth2Model implements AuthorizationCodeModel, ClientCredentialsModel, RefreshTokenModel, PasswordModel, ExtensionModel {

    constructor(
        @inject(TYPE.Application) private readonly app: Express,
        @inject(TYPE.MongoDBClient) private readonly client: MongoService,
    ) {
    }

    private async cbAndPromise(fn: (db: Db) => Promise<any>, callback?): Promise<any> {
        return await this.client.withClient(async (db) => {
            const res = await fn(db);
            callback && callback(null, res);
            return res;
        })
            .catch((err) => {
                if (callback) callback(err)
                else throw err;
            });
    }

    /**
     * generates random string of characters i.e salt
     * @function
     * @param {number} length - Length of the random string.
     */
    private static genRandomString(length) {
        return randomBytes(Math.ceil(length / 2))
            .toString('hex') /** convert to hexadecimal format */
            .slice(0, length);   /** return required number of characters */
    };

    /**
     * hash password with sha512.
     * @function
     * @param {string} password - List of required fields.
     * @param {string} salt - Data to be validated.
     */
    private static sha512(password, salt) {
        const hash = createHmac('sha512', salt);
        /** Hashing algorithm sha512 */
        hash.update(password);
        const value = hash.digest('hex');
        return {
            salt,
            passwordHash: value
        };
    };

    private static saltHashPassword(userpassword) {
        const salt = process.env.SALT ?? this.genRandomString(16);
        /** Gives us salt of length 16 */
        const passwordData = this.sha512(userpassword, salt);
        // console.log('UserPassword = '+userpassword);
        // console.log('Passwordhash = '+passwordData.passwordHash);
        // console.log('nSalt = '+passwordData.salt);
        return passwordData;
    }

    private async getClientAndUser(clientId, userId) {
        return this.cbAndPromise(async (db) => {
            const clientsColl = db.collection<Client>('my-clients');
            const client = await clientsColl.findOne({_id: new ObjectId(clientId)});
            delete client?.clientSecret;

            const usersColl = db.collection<User>('my-users');
            const user = await usersColl.findOne({_id: new ObjectId(userId)});
            delete user?.hash;

            return {client, user};
        });
    }

    // region AuthorizationCode

    async saveAuthorizationCode(
        code: Pick<AuthorizationCode, "authorizationCode" | "expiresAt" | "redirectUri" | "scope">,
        client: Client,
        user: User,
        callback?: Callback<AuthorizationCode>,
    ): Promise<AuthorizationCode | Falsey> {
        console.log('saveAuthorizationCode =>');

        return this.cbAndPromise(async (db) => {
            const codeObj: MongoAuthorizationCode = {
                ...code,
                clientId: new ObjectId(client._id),
                userId: new ObjectId(user._id),
            };

            const coll = db.collection<MongoAuthorizationCode>('my-oauth2-codes');
            const res = await coll.findOneAndReplace({authorizationCode: codeObj.authorizationCode},
                codeObj,
                {upsert: true, returnOriginal: false});
            return res.ok ? res.value : undefined;
        }, callback);
    }

    async getAuthorizationCode(
        authorizationCode: string,
        callback?: Callback<AuthorizationCode>,
    ): Promise<AuthorizationCode | Falsey> {
        console.log('getAuthorizationCode =>');

        return this.cbAndPromise(async (db) => {
            const coll = db.collection<MongoAuthorizationCode>('my-oauth2-codes');
            const code = await coll.findOne({authorizationCode});

            if (code) {
                return {
                    ...code,
                    ...(await this.getClientAndUser(code.clientId, code.userId)),
                };
            }
        }, callback)
    }

    async revokeAuthorizationCode(
        code: AuthorizationCode,
        callback?: Callback<boolean>,
    ): Promise<boolean> {
        console.log('revokeAuthorizationCode =>');

        return this.cbAndPromise(async (db) => {
            const coll = db.collection<AuthorizationCode>('my-oauth2-codes');
            await coll.deleteMany({authorizationCode: code.authorizationCode});
            return true;
        }, callback);
    }

    // endregion

    // region Token

    async saveToken(
        token: Token,
        client: Client,
        user: User,
        callback?: Callback<Token>,
    ): Promise<Token | Falsey> {
        console.log('saveToken =>');

        return this.cbAndPromise(async (db) => {
            const tokenObj: Token = {
                ...token,
                clientId: new ObjectId(client._id),
                userId: new ObjectId(user._id),
            };

            const coll = db.collection<Token>('my-oauth2-tokens');
            const res = await coll.findOneAndReplace(
                tokenObj.accessToken
                    ? {accessToken: tokenObj.accessToken}
                    : {refreshToken: tokenObj.refreshToken},
                tokenObj,
                {upsert: true, returnOriginal: false});
            return res.ok ? res.value : undefined;
        }, callback);
    }

    async getAccessToken(
        accessToken: string,
        callback?: Callback<Token>,
    ): Promise<Token | Falsey> {
        console.log('getAccessToken =>');

        return this.cbAndPromise(async (db) => {
            const coll = db.collection<Token>('my-oauth2-tokens');
            const token = await coll.findOne({accessToken});

            if (token) {
                return {
                    ...token,
                    ...(await this.getClientAndUser(token.clientId, token.userId)),
                };
            }
        }, callback);
    }

    async getRefreshToken(
        refreshToken: string,
        callback?: Callback<RefreshToken>,
    ): Promise<RefreshToken | Falsey> {
        console.log('getRefreshToken =>');

        return this.cbAndPromise(async (db) => {
            const coll = db.collection<RefreshToken>('my-oauth2-tokens');
            const token = await coll.findOne({refreshToken});

            if (token) {
                return {
                    ...token,
                    ...(await this.getClientAndUser(token.clientId, token.userId)),
                };
            }
        }, callback);
    }

    async revokeToken(
        token: RefreshToken | Token,
        callback?: Callback<boolean>,
    ): Promise<boolean> {
        console.log('revokeToken =>');

        return this.cbAndPromise(async (db) => {
            const coll = db.collection<Token>('my-oauth2-tokens');
            await coll.deleteMany(
                token.accessToken
                    ? {accessToken: token.accessToken}
                    : {refreshToken: token.refreshToken});
            return true;
        }, callback);
    }

    // endregion

    //

    async getClient(
        clientId: string,
        clientSecret: string | null,
        callback?: Callback<Client | Falsey>,
    ): Promise<Client | Falsey> {
        return this.cbAndPromise(async (db) => {
            const coll = db.collection<Client>('my-clients');
            const client = await coll.findOne(clientSecret ? {clientId, clientSecret} : {clientId},
                {projection: {clientSecret: false}});
            return client ?? undefined;
        }, callback);
    }

    async getUser(
        username: string,
        password: string,
        callback?: Callback<User | Falsey>,
    ): Promise<User | Falsey> {
        return this.cbAndPromise(async (db) => {
            const coll = db.collection<User>('my-users');
            const data = OAuth2Model.saltHashPassword(password);
            const user = await coll.findOne({username, hash: data.passwordHash},
                {projection: {hash: false}});
            return user ?? undefined;
        }, callback);
    }

    async getUserFromClient(
        client: Client,
        callback?: Callback<User | Falsey>,
    ): Promise<User | Falsey> {
        return this.cbAndPromise(async (db) => {
            const coll = db.collection<User>('my-users');
            const user = await coll.findOne({_id: new ObjectId(client.userId)},
                {projection: {hash: false}});
            return user ?? undefined;
        }, callback);
    }

    async verifyScope(
        token: Token,
        scope: string | string[],
        callback?: Callback<boolean>,
    ): Promise<boolean> {
        console.log('verifyScope =>', scope);

        return this.cbAndPromise(async (db) => {
            return true;
        }, callback);
    }

}
