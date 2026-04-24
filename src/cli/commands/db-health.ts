
import { Kadmium } from "../../kadmium-app.js";

export async function run() {

	Kadmium.setConfig();

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
		return; // ✅ вместо process.exit(0)
	}

	console.log("\n⚠️  Schema mismatches detected:\n");
	for (const issue of health.issues) {
		console.log(`   • ${issue}`);
	}

	console.log('\n   Run "kadmium db:diff" for details.');
	console.log('   Run "kadmium db:migrate" to apply changes.\n');

	// ❗ сигнализируем об ошибке через throw
	throw new Error("Database schema mismatch");
}