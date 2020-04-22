import {Db, MongoClient} from "mongodb";
import {TYPE} from "./ioc/const";
import {provideIf} from "./ioc/ioc";

@provideIf(TYPE.MongoDBClient, true)
export class MongoService {
    private client: MongoClient;

    // tslint:disable-next-line:no-empty
    constructor() {
    }

    private async getConnection() {
        if (!this.client) {
            const client = new MongoClient(process.env.MONGO_URI ?? '', {
                useUnifiedTopology: true,
            });

            this.client = await client.connect();
        }
        return this.client;
    }

    async withClient(fn: (db: Db) => Promise<any>) {
        const conn = await this.getConnection();
        return await fn(conn.db());
    }
}

