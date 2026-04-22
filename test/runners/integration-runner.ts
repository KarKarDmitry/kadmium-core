import { Kadmium } from "../../src/kadmium-app";
import { User } from "../../src/models/schemas/User";
import { Post } from "../../src/models/schemas/Post";
import { Comment } from "../../src/models/schemas/Comment";
import { Department } from "../../src/models/schemas/Department";
import { Tag } from "../../src/models/schemas/Tag";
import { Post_tag } from "../../src/models/schemas/Post_tag";
import * as dotenv from "dotenv";
import { IntegrationTestCase } from "../types/IntegrationTestCase";

import { TC__OrmUsage } from "../integration/TC__OrmUsage";
import { TC1_SimpleOR } from "../integration/TC1_SimpleOR";
import { TC2_ComplexGroups } from "../integration/TC2_ComplexGroups";
import { TC3_SingleRepoGroups } from "../integration/TC3_SingleRepoGroups";
import { TC4_DeeplyNested } from "../integration/TC4_DeeplyNested";
import { TC5_GroupBy } from "../integration/TC5_GroupBy";
import { TC6_BulkCreate } from "../integration/TC6_BulkCreate";
import { TC7_Subquery } from "../integration/TC7_Subquery";
import { TC8_FilterSyntax } from "../integration/TC8_FilterSyntax";
import { TC9_AdvancedBuilders } from "../integration/TC9_AdvancedBuilders";
import { TC10_TriangleJoin } from "../integration/TC10_TriangleJoin";
import { TC11_IslandJoin } from "../integration/TC11_IslandJoin";
import { TC12_RawQuery } from "../integration/TC12_RawQuery";
import { TC13_ApiErgonomics } from "../integration/TC13_ApiErgonomics";
import { TC14_Include } from "../integration/TC14_Include";
import { TC15_Security } from "../integration/TC15_Security";
import { TC16_Controllers } from "../integration/TC16_Controllers";
import { TC17_ControllerIntegration } from "../integration/TC17_ControllerIntegration";
import { TC18_ControllerValidation } from "../integration/TC18_ControllerValidation";
import { TC19_Transactions } from "../integration/TC19_Transactions";
import { TC20_DbMutator } from "../integration/TC20_DbMutator";
import { TC21_Features } from "../integration/TC21_Features";
import { TC22_Features_Extended } from "../integration/TC22_Features_Extended";
import { TC23_InlineHooks } from "../integration/TC23_InlineHooks";

import { Profiler } from "../../src/core/profiling/profiler";

// Load environment variables from .env file
dotenv.config();

async function runAllTests() {
	// ----------------------------
	// 0️⃣ Configure and start the application
	// ----------------------------
	Kadmium.configure({
		schemaSources: ["./src/example-schemas/*.schema.ts"],
		db: {
			host: process.env.DB_HOST || "localhost",
			port: Number(process.env.DB_PORT) || 5432,
			database: process.env.DB_NAME || "kadmium",
			login: process.env.DB_LOGIN || "postgres",
			pass: process.env.DB_PASSWORD || "",
		},
	});

	await Kadmium.start();
	console.log("Test Runner configured and schemas registered.");

	// ----------------------------
	// 1️⃣ Get Repositories
	// ----------------------------
	const userRepo = Kadmium.Repo.get(User);
	const postRepo = Kadmium.Repo.get(Post);
	const commentRepo = Kadmium.Repo.get(Comment);
	const departmentRepo = Kadmium.Repo.get(Department);
	const tagRepo = Kadmium.Repo.get(Tag);
	const postTagRepo = Kadmium.Repo.get(Post_tag);

	// ----------------------------
	// 2️⃣ Define Test Cases
	// ----------------------------
	const tests: IntegrationTestCase[] = [
		new TC1_SimpleOR(Kadmium),
		new TC2_ComplexGroups(Kadmium),
		new TC3_SingleRepoGroups(Kadmium),
		new TC4_DeeplyNested(Kadmium),
		new TC5_GroupBy(Kadmium),
		new TC6_BulkCreate(Kadmium),
		new TC7_Subquery(Kadmium),
		new TC8_FilterSyntax(Kadmium),
		new TC9_AdvancedBuilders(Kadmium),
		new TC10_TriangleJoin(Kadmium),
		new TC11_IslandJoin(Kadmium),
		new TC12_RawQuery(Kadmium),
		new TC13_ApiErgonomics(Kadmium),
		new TC14_Include(Kadmium),
		new TC15_Security(Kadmium),
		new TC16_Controllers(Kadmium),
		new TC17_ControllerIntegration(Kadmium),
		new TC18_ControllerValidation(Kadmium),
		new TC19_Transactions(Kadmium),
		new TC20_DbMutator(Kadmium),
		new TC21_Features(Kadmium),
		new TC22_Features_Extended(Kadmium),
		new TC23_InlineHooks(Kadmium),

		new TC__OrmUsage(Kadmium),
	];

	// ----------------------------
	// 3️⃣ Run Tests
	// ----------------------------
	let failed = false;
	const userIds: string[] = [];
	try {
		Profiler.enable(true);

		// ── Initial cleanup (ensure clean state) ──
		console.log("\n[Test Runner] Clearing leftover data...");
		await Kadmium.Repo.raw(`DELETE FROM "comment"`).go();
		await Kadmium.Repo.raw(`DELETE FROM "post_tag"`).go();
		await Kadmium.Repo.raw(`DELETE FROM "post"`).go();
		await Kadmium.Repo.raw(`DELETE FROM "tag"`).go();
		await Kadmium.Repo.raw(`DELETE FROM "user"`).go();
		await Kadmium.Repo.raw(`DELETE FROM "department"`).go();
		await Kadmium.Repo.raw(`DELETE FROM "revision"`).go();
		console.log("   - Clean state ensured.");

		// SETUP from app.ts
		console.log("\n[Test Runner] Setting up test data...");
		const devDept = await departmentRepo.create({ name: "Developers" }).go();
		const hrDept = await departmentRepo.create({ name: "HR" }).go();
		const userA = await userRepo
			.create({
				first_name: "Alice",
				last_name: "Admin",
				department_id: devDept.id,
				email: `alice.${Date.now()}@example.com`,
				username: `alice${Date.now()}`,
				password: "a-secure-password",
			})
			.go();
		userIds.push(userA.id);
		const userB = await userRepo
			.create({
				first_name: "Bob",
				last_name: "Editor",
				department_id: devDept.id,
				email: `bob.${Date.now()}@example.com`,
				username: `bob${Date.now()}`,
				password: "a-secure-password",
			})
			.go();
		userIds.push(userB.id);
		const userC = await userRepo
			.create({
				first_name: "Charlie",
				last_name: "Admin",
				department_id: hrDept.id,
				middle_name: "Chester",
				email: `charlie.${Date.now()}@example.com`,
				username: `charlie${Date.now()}`,
				password: "a-secure-password",
			})
			.go();
		userIds.push(userC.id);
		const userD = await userRepo
			.create({
				first_name: "David",
				last_name: "User",
				email: `david.${Date.now()}@example.com`,
				username: `david${Date.now()}`,
				password: "a-secure-password",
			})
			.go();
		userIds.push(userD.id);
		const postA = await postRepo
			.create({
				title: "Alice's Public Post",
				author_id: userA.id,
				is_published: true,
				published_at: new Date(Date.now() - 2 * 86400 * 1000),
			})
			.go();
		await postRepo
			.create({
				title: "Alice's Private Draft",
				author_id: userA.id,
				is_published: false,
			})
			.go();
		const postC_item = await postRepo
			.create({
				title: "Bob's News (Published)",
				author_id: userB.id,
				is_published: true,
				published_at: new Date(),
			})
			.go();
		await postRepo
			.create({
				title: "Charlie's Draft",
				author_id: userC.id,
				is_published: false,
			})
			.go();
		await postRepo
			.create({
				title: "David's Public Post",
				author_id: userD.id,
				is_published: true,
				published_at: new Date(Date.now() + 2 * 86400 * 1000),
			})
			.go();
		await commentRepo
			.create({ body: "Self-comment", post_id: postA.id, user_id: userA.id })
			.go();
		await commentRepo
			.create({
				body: "Comment from Bob",
				post_id: postA.id,
				user_id: userB.id,
			})
			.go();
		const tagSql = await tagRepo.create({ name: "SQL" }).go();
		const tagTS = await tagRepo.create({ name: "TypeScript" }).go();
		await postTagRepo.create({ post_id: postA.id, tag_id: tagSql.id }).go();
		await postTagRepo
			.create({ post_id: postC_item.id, tag_id: tagSql.id })
			.go();
		await postTagRepo.create({ post_id: postA.id, tag_id: tagTS.id }).go();
		console.log("   - Test data created.");

		// RUN all test cases
		for (const test of tests) {
			try {
				console.log(`\n--- RUNNING: ${test.name} ---`);
				await test.run();
				test.logResult(true);
			} catch (e) {
				failed = true;
				test.logResult(false);
				console.error(e);
			}
		}
	} catch (e) {
		failed = true;
		console.error("\n--- A FATAL ERROR occurred during setup ---", e);
	} finally {
		// CLEANUP from app.ts — order matters due to FK constraints
		// Using raw SQL to bypass soft-delete and ensure actual deletion
		console.log("\n[Test Runner] Cleaning up all test data...");
		await Kadmium.Repo.raw(`DELETE FROM "comment"`).go(); // 1. comments (FK to posts, users)
		await Kadmium.Repo.raw(`DELETE FROM "post_tag"`).go(); // 2. post_tag (FK to posts, tags)
		await Kadmium.Repo.raw(`DELETE FROM "post"`).go(); // 3. posts (FK to users)
		await Kadmium.Repo.raw(`DELETE FROM "tag"`).go(); // 4. tags
		await Kadmium.Repo.raw(`DELETE FROM "user"`).go(); // 5. users (FK from posts, comments)
		await Kadmium.Repo.raw(`DELETE FROM "department"`).go(); // 6. departments (FK from users)
		await Kadmium.Repo.raw(`DELETE FROM "revision"`).go(); // 7. revisions (FK to user)

		console.log("   - Cleanup complete.");

		if (failed) {
			console.error("\n\n--- TESTS FAILED ---");
			process.exit(1);
		} else {
			console.log("\n\n--- ALL TESTS PASSED! ---");
		}

		Profiler.results();
	}
}

runAllTests().catch((err) => {
	console.error("FATAL RUNNER ERROR:", err);
	process.exit(1);
});
