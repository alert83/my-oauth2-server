import {Db, MongoClient} from "mongodb";
import {TYPE} from "./ioc/const";
import {provideIf} from "./ioc/ioc";

@provideIf(TYPE.MongoDBClient, true)
export class MongoService {
    private client: MongoClient;

    constructor() {
        this.client = new MongoClient(process.env.MONGO_URI ?? '', {
            useUnifiedTopology: true,
        });
    }

    async withClient(fn: (db: Db) => Promise<any>) {
        try {
            if (!this.client.isConnected()) await this.client.connect();
            return await fn(this.client.db());
        } finally {
            // await this.client.close();
        }
    }
}

