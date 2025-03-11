"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNestServer = void 0;
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const platform_express_1 = require("@nestjs/platform-express");
const express = require("express");
const server = express();
const createNestServer = async (expressInstance) => {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(expressInstance));
    await app.init();
};
exports.createNestServer = createNestServer;
(0, exports.createNestServer)(server);
//# sourceMappingURL=AppFactory.js.map