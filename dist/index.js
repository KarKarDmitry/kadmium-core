"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./core/app-core"), exports);
__exportStar(require("./core/types/config"), exports);
__exportStar(require("./kadmium-app"), exports);
__exportStar(require("./schema/init"), exports);
__exportStar(require("./controller/init"), exports);
__exportStar(require("./validation"), exports);
__exportStar(require("./route/adapters/rest.adapter"), exports);
__exportStar(require("./sqb/adapters/postgres"), exports);
// Auth module exports
__exportStar(require("./auth"), exports);
// Default export for convenience
const kadmium_app_1 = require("./kadmium-app");
exports.default = kadmium_app_1.Kadmium;
//# sourceMappingURL=index.js.map