"use strict";
/**
 * CLI command: kadmium:db:health
 * Checks if the database schema matches the defined schemas.
 *
 * Usage:
 *   ts-node ./src/cli/commands/db-health.ts
 */
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const kadmium_app_1 = require("../../kadmium-app");
dotenv.config();
async function main() {
    kadmium_app_1.Kadmium.configure({
        schemaSources: ["./src/example-schemas/**/*.schema.ts"],
        db: {
            host: process.env.DB_HOST || "localhost",
            port: Number(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME || "kadmium",
            login: process.env.DB_LOGIN || "postgres",
            pass: process.env.DB_PASSWORD || "",
        },
    });
    await kadmium_app_1.Kadmium.start();
    console.log("[db:health] Schemas loaded and registered.\n");
    const health = kadmium_app_1.Kadmium.getHealthCheck();
    console.log("═══════════════════════════════════════════");
    console.log("  Database Health Check");
    console.log("═══════════════════════════════════════════");
    console.log(`  Tables in DB:      ${health.summary.totalTables}`);
    console.log(`  Expected tables:   ${health.summary.expectedTables}`);
    console.log(`  Matching tables:   ${health.summary.matchingTables}`);
    console.log("═══════════════════════════════════════════");
    if (health.isHealthy) {
        console.log("\n✅ Database is healthy — all schemas match DB.\n");
        process.exit(0);
    }
    else {
        console.log("\n⚠️  Schema mismatches detected:\n");
        for (const issue of health.issues) {
            console.log(`   • ${issue}`);
        }
        console.log('\n   Run "npm run kadmium:db:diff" for details.');
        console.log('   Run "npm run kadmium:db:migrate" to apply changes.\n');
        process.exit(1);
    }
}
main().catch((err) => {
    console.error("FATAL ERROR:", err);
    process.exit(1);
});
//# sourceMappingURL=db-health.js.map