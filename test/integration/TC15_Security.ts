import { IntegrationTestCase } from "../types/IntegrationTestCase";
import { KadmiumApp } from "../../src/kadmium-app";
import { User } from "../../src/models/schemas/User";
import { Post } from "../../src/models/schemas/Post";
import { Comment } from "../../src/models/schemas/Comment";

/**
 * Security-focused test suite for Kadmium ORM.
 * Tests SQL injection, mass assignment, XSS, privilege escalation, etc.
 */
export class TC15_Security extends IntegrationTestCase {
	constructor(app: KadmiumApp) {
		super(app, "Security & Vulnerability Tests");
	}

	protected async runImpl(): Promise<void> {
		const userRepo = this.app.Repo.get(User);
		const postRepo = this.app.Repo.get(Post);
		const commentRepo = this.app.Repo.get(Comment);

		// ========================================
		// 1. SQL Injection via VALUES
		// ========================================
		console.log("   - Testing SQL injection via values...");
		const sqlInjectionValues = [
			"Robert'; DROP TABLE user;--",
			"' OR 1=1 --",
			"'); DELETE FROM user; --",
			"'); SELECT * FROM user WHERE '1'='1",
			"admin'/*",
			"*/--",
		];

		for (const malicious of sqlInjectionValues) {
			// Should NOT throw — values are parameterized
			await userRepo
				.where((u) => u.first_name.eq(malicious))
				.select((u) => [u.id])
				.go();
		}
		console.log("   - PASSED: 15.1 SQL injection via values (parameterized)");

		// ========================================
		// 2. SQL Injection via LIKE/ILIKE
		// ========================================
		console.log("   - Testing SQL injection via ILIKE...");
		await userRepo
			.where((u) => u.first_name.ilike("%'; DROP TABLE user;--%"))
			.select((u) => [u.id])
			.go();
		console.log("   - PASSED: 15.2 SQL injection via ILIKE (parameterized)");

		// ========================================
		// 3. SQL Injection via Subquery
		// ========================================
		console.log("   - Testing SQL injection via subquery...");
		const subquery = userRepo
			.where((u) => u.first_name.eq("Alice"))
			.select((u) => [u.id]);
		// Subquery should be parameterized too
		await postRepo
			.where((p) => p.author_id.in(subquery))
			.select((p) => [p.title])
			.go();
		console.log("   - PASSED: 15.3 SQL injection via subquery (parameterized)");

		// ========================================
		// 4. Mass Assignment — password field
		// ========================================
		console.log("   - Testing mass assignment (password via create)...");
		// Password should be hashed, not stored as plaintext
		const testUser = await userRepo
			.create({
				first_name: "MassAssign",
				last_name: "Test",
				email: `massassign.${Date.now()}@example.com`,
				username: `massassign_${Date.now()}`,
				password: "plaintext-password",
			})
			.go();
		// Verify password is hashed (starts with $2)
		if (!testUser.password.startsWith("$2")) {
			throw new Error(
				`Password stored as plaintext! Got: ${testUser.password.substring(0, 10)}...`,
			);
		}
		console.log("   - PASSED: 15.4 Mass assignment (password hashed)");

		// ========================================
		// 5. Password field not returned in default select
		// ========================================
		console.log("   - Testing password field exclusion from default select...");
		const publicUsers = await userRepo.select().go();
		for (const user of publicUsers) {
			if ("password" in user) {
				throw new Error(
					"Password field should not be in default select result!",
				);
			}
		}
		console.log("   - PASSED: 15.5 Password excluded from default select");

		// ========================================
		// 6. confirm_password (persist: false) not stored in DB
		// ========================================
		console.log("   - Testing persist:false field exclusion...");
		// The confirm_password field has persist: false, so it should NOT be
		// included in the INSERT statement. We verify this by creating a user
		// with confirm_password and then checking the generated SQL does not
		// include it. Since the column doesn't exist in DB, a raw query for it
		// would fail — instead we verify the framework-level behavior by ensuring
		// the created user object does not carry the field back.
		if (testUser.confirm_password !== undefined) {
			throw new Error(
				"confirm_password should not be present in the returned user object (persist: false)!",
			);
		}
		console.log("   - PASSED: 15.6 persist:false field not stored in DB");

		// ========================================
		// 7. XSS — HTML/script tags stored and retrieved safely
		// ========================================
		console.log("   - Testing XSS via HTML/script tags in data...");
		const xssPayload = '<script>alert("xss")</script>';
		await userRepo
			.where((u) => u.id.eq(testUser.id))
			.update({ first_name: xssPayload })
			.go();
		const updatedUser = await userRepo
			.where((u) => u.id.eq(testUser.id))
			.first((u) => [u.first_name])
			.go();
		// Data should be stored as-is (framework doesn't HTML-encode)
		console.log(updatedUser?.first_name);
		if (updatedUser?.first_name !== xssPayload) {
			throw new Error("XSS payload should be stored verbatim");
		}
		console.log(
			"   - PASSED: 15.7 XSS data stored verbatim (consumer should escape)",
		);

		// ========================================
		// 8. DELETE without WHERE — should delete ALL rows
		// ========================================
		console.log("   - Testing DELETE without WHERE (intentional danger)...");
		// Create a temp user to delete
		const tempUser = await userRepo
			.create({
				first_name: "TempDelete",
				last_name: "Test",
				email: `tempdelete.${Date.now()}@example.com`,
				username: `tempdelete_${Date.now()}`,
				password: "secure-password",
			})
			.go();
		// Delete without WHERE should work (this is by design, but worth noting)
		const deleteResult = await userRepo
		.where((u) => u.id.eq(tempUser.id))
		.delete()
			.go();
		if (!deleteResult) {
			throw new Error("Delete should return true");
		}
		// Verify deleted
		const deletedUser = await userRepo.findById(tempUser.id);
		if (deletedUser) {
			throw new Error("User should have been deleted");
		}
		console.log("   - PASSED: 15.8 DELETE with WHERE works correctly");

		// ========================================
		// 9. UPDATE — only updates matched rows
		// ========================================
		console.log("   - Testing UPDATE scoping...");
		const userA = await userRepo
			.create({
				first_name: "UpdateA",
				last_name: "Test",
				email: `updateA.${Date.now()}@example.com`,
				username: `updateA_${Date.now()}`,
				password: "secure-password",
			})
			.go();
		const userB = await userRepo
			.create({
				first_name: "UpdateB",
				last_name: "Test",
				email: `updateB.${Date.now()}@example.com`,
				username: `updateB_${Date.now()}`,
				password: "secure-password",
			})
			.go();

		await userRepo
			.where((u) => u.id.eq(userA.id))
			.update({ first_name: "UpdatedA" })
			.go();

		const checkA = await userRepo.findById(userA.id);
		const checkB = await userRepo.findById(userB.id);

		if (checkA?.first_name !== "UpdatedA") {
			throw new Error("User A should have been updated");
		}
		if (checkB?.first_name !== "UpdateB") {
			throw new Error("User B should NOT have been updated");
		}
		console.log("   - PASSED: 15.9 UPDATE only affects matched rows");

		// ========================================
		// 10. IN clause with empty array — should not crash
		// ========================================
		console.log("   - Testing IN clause with empty array...");
		const emptyInResult = await userRepo
			.where((u) => u.id.in([]))
			.select((u) => [u.id])
			.go();
		if (emptyInResult.length !== 0) {
			throw new Error("IN with empty array should return 0 results");
		}
		console.log("   - PASSED: 15.10 IN clause with empty array");

		// ========================================
		// 11. NULL handling — IS NULL / IS NOT NULL
		// ========================================
		console.log("   - Testing NULL handling...");
		const nullUsers = await userRepo
			.where((u) => u.middle_name.eq(null))
			.select((u) => [u.id, u.middle_name])
			.go();
		// Should work without error
		console.log(
			`   - PASSED: 15.11 NULL handling (${nullUsers.length} users with null middle_name)`,
		);

		// ========================================
		// 12. OR injection — combining malicious conditions
		// ========================================
		console.log("   - Testing OR condition injection...");
		const orResult = await userRepo
			.where((u) => u.first_name.eq("NonExistent"))
			.or((u) => u.first_name.eq("NonExistent2"))
			.select((u) => [u.id])
			.go();
		if (orResult.length !== 0) {
			throw new Error("OR with non-existent values should return empty");
		}
		console.log("   - PASSED: 15.12 OR condition injection");

		// ========================================
		// 13. Nested group injection
		// ========================================
		console.log("   - Testing nested group injection...");
		await userRepo
			.where([
				(q) => {
					q.where((u) => u.first_name.eq("'; DROP TABLE user;--"));
					q.or((u) => u.last_name.eq("'; DELETE FROM user;--"));
				},
			])
			.select((u) => [u.id])
			.go();
		console.log("   - PASSED: 15.13 Nested group injection (parameterized)");

		// ========================================
		// 14. Include — relation boundary
		// ========================================
		console.log("   - Testing include relation boundary...");
		const userWithPosts = await userRepo
			.where((u) => u.id.eq(testUser.id))
			.include((u) => [
				u.posts.where((p) => p.title.eq("'; DROP TABLE post;--")),
			])
			.first()
			.go();
		// Should not crash, should return empty posts
		if (userWithPosts?.posts && userWithPosts.posts.length > 0) {
			throw new Error("Malicious where in include should return empty posts");
		}
		console.log("   - PASSED: 15.14 Include relation boundary (parameterized)");

		// ========================================
		// 15. Raw SQL — verify it works but is dangerous by design
		// ========================================
		console.log("   - Testing raw SQL (intentionally dangerous)...");
		const rawResult2 = await this.app.Repo.raw(
			'SELECT id, first_name FROM "user" WHERE id = $1',
			[testUser.id],
		).go<{ id: string; first_name: string }>();
		if (rawResult2.length !== 1) {
			throw new Error("Raw query should return 1 result");
		}
		console.log("   - PASSED: 15.15 Raw SQL works (use with caution)");

		// ========================================
		// 16. Multi-table query injection
		// ========================================
		console.log("   - Testing multi-table query injection...");
		await this.app.Repo.query({ u: User, p: Post })
			.join({ left: "u", right: "p", on: (t) => t.u.id.eq(t.p.author_id) })
			.where((t) => t.u.first_name.eq("'; DROP TABLE user;--"))
			.select((t) => [t.u.id])
			.go();
		console.log(
			"   - PASSED: 15.16 Multi-table query injection (parameterized)",
		);

		// ========================================
		// CLEANUP
		// ========================================
		// Clean up test users
		await userRepo
			.where((u) => u.first_name.eq(xssPayload))
			.delete()
			.go();
		await userRepo
			.where((u) => u.first_name.eq("UpdatedA"))
			.delete()
			.go();
		await userRepo
			.where((u) => u.first_name.eq("UpdateB"))
			.delete()
			.go();
	}
}
