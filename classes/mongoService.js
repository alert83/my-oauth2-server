"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const const_1 = require("./ioc/const");
const ioc_1 = require("./ioc/ioc");
let MongoService = class MongoService {
    constructor() {
        var _a;
        this.client = new mongodb_1.MongoClient((_a = process.env.MONGO_URI) !== null && _a !== void 0 ? _a : '', {
            useUnifiedTopology: true,
        });
    }
    async withClient(fn) {
        try {
            if (!this.client.isConnected())
                await this.client.connect();
            return await fn(this.client.db());
        }
        finally {
        }
    }
};
MongoService = __decorate([
    ioc_1.provideIf(const_1.TYPE.MongoDBClient, true),
    __metadata("design:paramtypes", [])
], MongoService);
exports.MongoService = MongoService;
