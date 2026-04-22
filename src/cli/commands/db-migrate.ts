/**
 * CLI command: kadmium:db:migrate
 * Applies schema migrations to the database.
 * Wraps all operations in a transaction for safety.
 *
 * Usage:
 *   ts-node ./src/cli/commands/db-migrate.ts
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
	console.log("[db:migrate] Schemas loaded and registered.\n");

	const dbMutator = Kadmium.getDbMutator();
	if (!dbMutator) {
		console.error("❌ DbMutator not initialized. Call Kadmium.start() first.\n");
		process.exit(1);
	}

	const diff = await dbMutator.getDiff();

	if (!diff.hasChanges) {
		console.log("✅ No changes detected. DB matches schemas.\n");
		process.exit(0);
	}

	const dbAdapter = (Kadmium as any).dbAdapter;
	const txAdapter = await dbAdapter.beginTransaction();

	try {
		const applied = await dbMutator.applyMigrations(txAdapter);

		// Count applied operations by type
		let createdTables = 0, addedColumns = 0, alteredColumns = 0, addedIndexes = 0, addedFKs = 0;
		for (const op of applied) {
			if (op.startsWith("CREATE TABLE")) createdTables++;
			else if (op.startsWith("ADD COLUMN")) addedColumns++;
			else if (op.startsWith("ALTER TYPE") || op.startsWith("ALTER NULLABLE") || op.startsWith("ALTER DEFAULT")) alteredColumns++;
			else if (op.startsWith("ADD INDEX")) addedIndexes++;
			else if (op.startsWith("ADD FK")) addedFKs++;
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
	} catch (err) {
		// applyMigrations may have already committed phase 1,
		// so rollback might not undo table creation. Still attempt it.
		try {
			await txAdapter.rollback();
		} catch {
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
