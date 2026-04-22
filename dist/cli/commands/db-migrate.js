"use strict";
/**
 * CLI command: kadmium:db:migrate
 * Applies schema migrations to the database.
 * Wraps all operations in a transaction for safety.
 *
 * Usage:
 *   ts-node ./src/cli/commands/db-migrate.ts
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
    console.log("[db:migrate] Schemas loaded and registered.\n");
    const dbMutator = kadmium_app_1.Kadmium.getDbMutator();
    if (!dbMutator) {
        console.error("❌ DbMutator not initialized. Call Kadmium.start() first.\n");
        process.exit(1);
    }
    const diff = await dbMutator.getDiff();
    if (!diff.hasChanges) {
        console.log("✅ No changes detected. DB matches schemas.\n");
        process.exit(0);
    }
    const dbAdapter = kadmium_app_1.Kadmium.dbAdapter;
    const txAdapter = await dbAdapter.beginTransaction();
    try {
        const applied = await dbMutator.applyMigrations(txAdapter);
        // Count applied operations by type
        let createdTables = 0, addedColumns = 0, alteredColumns = 0, addedIndexes = 0, addedFKs = 0;
        for (const op of applied) {
            if (op.startsWith("CREATE TABLE"))
                createdTables++;
            else if (op.startsWith("ADD COLUMN"))
                addedColumns++;
            else if (op.startsWith("ALTER TYPE") || op.startsWith("ALTER NULLABLE") || op.startsWith("ALTER DEFAULT"))
                alteredColumns++;
            else if (op.startsWith("ADD INDEX"))
                addedIndexes++;
            else if (op.startsWith("ADD FK"))
                addedFKs++;
        }
        console.log("═══════════════════════════════════════════");
        console.log("  Migrations Applied");
        console.log("═══════════════════════════════════════════");
        console.log(`  Added tables:      ${createdTables}`);
        console.log(`  Added columns:     ${addedColumns}`);
        console.log(`  Altered columns:   ${alteredColumns}`);
        console.log(`  Added indexes:     ${addedIndexes}`);
        console.log(`  Added FKs:         ${addedFKs}`);
        console.log("═══════════════════════════════════════════\n");
        console.log("✅ Migrations applied successfully:\n");
        for (const op of applied) {
            console.log(`   ✓ ${op}`);
        }
        console.log();
        process.exit(0);
    }
    catch (err) {
        // applyMigrations may have already committed phase 1,
        // so rollback might not undo table creation. Still attempt it.
        try {
            await txAdapter.rollback();
        }
        catch {
            // Ignore — partial commit already happened
        }
        console.error("\n❌ Migration failed.\n");
        console.error(err);
        process.exit(1);
    }
}
main().catch((err) => {
    console.error("FATAL ERROR:", err);
    process.exit(1);
});
//# sourceMappingURL=db-migrate.js.map