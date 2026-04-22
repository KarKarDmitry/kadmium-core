"use strict";
/**
 * CLI command: kadmium:db:diff
 * Shows detailed diff between schema definitions and actual DB.
 * Includes SQL preview.
 *
 * Usage:
 *   ts-node ./src/cli/commands/db-diff.ts
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
    console.log("[db:diff] Schemas loaded and registered.\n");
    const dbMutator = kadmium_app_1.Kadmium.getDbMutator();
    if (!dbMutator) {
        console.error("❌ DbMutator not initialized. Call Kadmium.start() first.\n");
        process.exit(1);
    }
    const diffResult = await dbMutator.getDiff();
    console.log("═══════════════════════════════════════════");
    console.log("  Schema Diff");
    console.log("═══════════════════════════════════════════");
    console.log(`  Added tables:      ${diffResult.summary.addedTables}`);
    console.log(`  Dropped tables:    ${diffResult.summary.droppedTables}`);
    console.log(`  Added columns:     ${diffResult.summary.addedColumns}`);
    console.log(`  Dropped columns:   ${diffResult.summary.droppedColumns}`);
    console.log(`  Altered columns:   ${diffResult.summary.alteredColumns}`);
    console.log(`  Added indexes:     ${diffResult.summary.addedIndexes}`);
    console.log(`  Dropped indexes:   ${diffResult.summary.droppedIndexes}`);
    console.log(`  Added FKs:         ${diffResult.summary.addedForeignKeys}`);
    console.log(`  Dropped FKs:       ${diffResult.summary.droppedForeignKeys}`);
    console.log("═══════════════════════════════════════════");
    if (!diffResult.hasChanges) {
        console.log("\n✅ No changes detected. DB matches schemas.\n");
        process.exit(0);
    }
    console.log("\n📝 SQL Preview:\n");
    const sqlStatements = await dbMutator.getMigrationPreview();
    for (let i = 0; i < sqlStatements.length; i++) {
        const op = diffResult.operations[i];
        const sql = sqlStatements[i];
        let label = "";
        switch (op.type) {
            case "create-table":
                label = `CREATE TABLE ${op.table}`;
                break;
            case "add-column":
                label = `ADD COLUMN ${op.table}.${op.column.name}`;
                break;
            case "drop-column":
                label = `DROP COLUMN ${op.table}.${op.columnName}`;
                break;
            case "alter-type":
                label = `ALTER TYPE ${op.table}.${op.columnName}`;
                break;
            case "alter-nullable":
                label = `ALTER NULLABLE ${op.table}.${op.columnName}`;
                break;
            case "add-index":
                label = `ADD INDEX ${op.index.name}`;
                break;
            case "drop-index":
                label = `DROP INDEX ${op.indexName}`;
                break;
            case "add-foreign-key":
                label = `ADD FK ${op.fk.name}`;
                break;
            case "drop-foreign-key":
                label = `DROP FK ${op.fkName}`;
                break;
            default:
                label = op.type;
        }
        console.log(`  ── ${label} ──`);
        console.log(`  ${sql}`);
        console.log();
    }
    console.log('   Run "npm run kadmium:db:migrate" to apply these changes.\n');
    process.exit(0);
}
main().catch((err) => {
    console.error("FATAL ERROR:", err);
    process.exit(1);
});
//# sourceMappingURL=db-diff.js.map