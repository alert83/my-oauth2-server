"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
exports.client = new mongodb_1.MongoClient((_a = process.env.MONGO_URI) !== null && _a !== void 0 ? _a : '', {
    useUnifiedTopology: true,
});
