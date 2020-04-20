const MongoClient = require('mongodb').MongoClient;

module.exports = new Promise((resolve, reject) => {
    MongoClient.connect(process.env.MONGO_URI, (err, client) => {
        if (err) return reject(err);
        // const db = client.db(dbName);
        // client.close();
        return resolve(client);
    });
});
