/**
 * CLI command: kadmium:db:health
 * Checks if the database schema matches the defined schemas.
 *
 * Usage:
 *   ts-node ./src/cli/commands/db-health.ts
 */

import * as dotenv from "dotenv";
import { Kadmium } from "../../kadmium-app";

dotenv.config();

async function main() {
	Kadmium.configure({
		schemaSources: ["./src/example-schemas/**/*.schema.ts"],
		db: {
			host: process.env.DB_HOST || "localhost",
			port: Number(process.env.DB_PORT) || 5432,
			database: process.env.DB_NAME || "kadmium",
			login: process.env.DB_LOGIN || "postgres",
			pass: process.env.DB_PASSWORD || "",
		},
	});

	await Kadmium.start();
	console.log("[db:health] Schemas loaded and registered.\n");

	const health = Kadmium.getHealthCheck();

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
	} else {
		console.log("\n⚠️  Schema mismatches detected:\n");
		for (const issue of health.issues) {
			console.log(`   • ${issue}`);
		}
		console.log(
			'\n   Run "npm run kadmium:db:diff" for details.',
		);
		console.log(
			'   Run "npm run kadmium:db:migrate" to apply changes.\n',
		);
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("FATAL ERROR:", err);
	process.exit(1);
});
