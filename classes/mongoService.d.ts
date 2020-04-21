import { Db } from "mongodb";
export declare class MongoService {
    private client;
    constructor();
    withClient(fn: (db: Db) => Promise<any>): Promise<any>;
}
