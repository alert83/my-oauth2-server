const MongoClient = require('mongodb').MongoClient;
const mongoClient = new MongoClient(process.env.MONGO_URI, {
    useUnifiedTopology: true,
});
module.exports = mongoClient;
