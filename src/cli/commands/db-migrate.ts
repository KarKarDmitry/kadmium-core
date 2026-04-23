import * as dotenv from "dotenv";
import { Kadmium } from "../../kadmium-app.js";

export async function run() {
	dotenv.config();

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
		throw new Error("DbMutator not initialized");
	}

	const diff = await dbMutator.getDiff();

	if (!diff.hasChanges) {
		console.log("✅ No changes detected. DB matches schemas.\n");
		return;
	}

	const dbAdapter = (Kadmium as any).dbAdapter;
	const txAdapter = await dbAdapter.beginTransaction();

	try {
		const applied = await dbMutator.applyMigrations(txAdapter);

		// статистика
		let createdTables = 0,
			addedColumns = 0,
			alteredColumns = 0,
			addedIndexes = 0,
			addedFKs = 0;

		for (const op of applied) {
			if (op.startsWith("CREATE TABLE")) createdTables++;
			else if (op.startsWith("ADD COLUMN")) addedColumns++;
			else if (
				op.startsWith("ALTER TYPE") ||
				op.startsWith("ALTER NULLABLE") ||
				op.startsWith("ALTER DEFAULT")
			)
				alteredColumns++;
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

	} catch (err) {
		try {
			await txAdapter.rollback();
		} catch {
			// ок, частичный commit уже мог произойти
		}

		console.error("\n❌ Migration failed.\n");
		throw err; // ❗ важно: не process.exit
	}
}