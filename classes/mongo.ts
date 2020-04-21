import {MongoClient} from "mongodb";

export const client = new MongoClient(process.env.MONGO_URI ?? '', {
    useUnifiedTopology: true,
});
