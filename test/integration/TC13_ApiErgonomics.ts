import { randomUUID } from "crypto";
import { IntegrationTestCase } from "../types/IntegrationTestCase";
import { KadmiumApp } from "../../src/kadmium-app";
import { User } from "../../src/models/schemas/User";
import { Post } from "../../src/models/schemas/Post";

export class TC13_ApiErgonomics extends IntegrationTestCase {
	constructor(app: KadmiumApp) {
		super(app, "API Ergonomics & Shortcuts");
	}

	protected async runImpl(): Promise<void> {
		const userRepo = this.app.Repo.get(User);
		const postRepo = this.app.Repo.get(Post);

		// 1. Test .limit()
		const limitedUsers = await userRepo.select().limit(2).go();
		if (limitedUsers.length !== 2) {
			throw new Error(
				`[FAIL 13.1 limit] Expected 2 users, got ${limitedUsers.length}`,
			);
		}
		console.log("   - PASSED: .limit()");

		// 2. Test .offset()
		const offsetUsers = await userRepo
			.select()
			.order((u) => u.first_name)
			.offset(1)
			.go();
		if (offsetUsers.length !== 5 || offsetUsers[0].first_name !== "Bob") {
			throw new Error(
				`[FAIL 13.2 offset] Expected 5 users starting with Bob, got ${offsetUsers.length} starting with ${offsetUsers[0]?.first_name}`,
			);
		}
		console.log("   - PASSED: .offset()");

		// 3. Test .page()
		const pagedUsers = await userRepo
			.select()
			.order((u) => u.first_name)
			.page(2, 2)
			.go(); // Get page 2, size 2 (users 3 and 4)
		if (pagedUsers.length !== 2 || pagedUsers[0].first_name !== "Charlie") {
			throw new Error(
				`[FAIL 13.3 page] Expected 2 users on page 2, got ${pagedUsers.length}`,
			);
		}
		console.log("   - PASSED: .page()");

		// 4. Test .first()
		const charlie = await userRepo
			.where((u) => u.first_name.eq("Charlie"))
			.first()
			.go();
		if (charlie?.first_name !== "Charlie") {
			throw new Error(
				`[FAIL 13.4 first] Did not find Charlie. Found: ${charlie?.first_name}`,
			);
		}
		const nonExistent = await userRepo
			.where((u) => u.first_name.eq("Zeke"))
			.first()
			.go();
		if (nonExistent !== undefined) {
			throw new Error(
				`[FAIL 13.4 first] Expected undefined for non-existent user, but got an object.`,
			);
		}
		console.log("   - PASSED: .first()");

		// 5. Test .count()
		const adminCount = await userRepo
			.where((u) => u.last_name.eq("Admin"))
			.count()
			.go();
		if (adminCount !== 2) {
			throw new Error(`[FAIL 13.5 count] Expected 2 admins, got ${adminCount}`);
		}
		console.log("   - PASSED: .count()");

		// 6. Test .exists()
		const davidExists = await userRepo
			.where((u) => u.first_name.eq("David"))
			.exists()
			.go();
		if (!davidExists) {
			throw new Error(
				`[FAIL 13.6 exists] Expected David to exist, but exists() returned false.`,
			);
		}
		const zekeExists = await userRepo
			.where((u) => u.first_name.eq("Zeke"))
			.exists()
			.go();
		if (zekeExists) {
			throw new Error(
				`[FAIL 13.6 exists] Expected Zeke not to exist, but exists() returned true.`,
			);
		}
		console.log("   - PASSED: .exists()");

		// 7. Test RepoManager.findById()
		const bob = await this.app.Repo.findById(User, offsetUsers[0].id); // Using Bob's ID from a previous query
		if (bob?.first_name !== "Bob") {
			throw new Error(
				`[FAIL 13.7 findById] Expected to find Bob by ID, but got ${bob?.first_name}`,
			);
		}

		const bob2 = await userRepo.findById(offsetUsers[0].id);
		if (bob2?.first_name !== "Bob") {
			throw new Error(
				`[FAIL 13.7 findById] Expected to find Bob by ID, but got ${bob2?.first_name}`,
			);
		}

		const nonExistentUser = await this.app.Repo.findById(User, randomUUID());
		if (nonExistentUser !== undefined) {
			throw new Error(
				`[FAIL 13.7 findById] Expected undefined for non-existent ID, but got an object.`,
			);
		}
		console.log("   - PASSED: RepoManager.findById()");

		// 8. Test RepoManager.count()
		const totalUserCount = await this.app.Repo.count(User);
		if (totalUserCount !== 6) {
			throw new Error(
				`[FAIL 13.8 count shortcut] Expected total count of 6, got ${totalUserCount}`,
			);
		}
		const editorCount = await this.app.Repo.count(User, (u) =>
			u.last_name.eq("Editor"),
		);
		if (editorCount !== 1) {
			throw new Error(
				`[FAIL 13.8 count shortcut] Expected 1 editor, got ${editorCount}`,
			);
		}
		console.log("   - PASSED: RepoManager.count()");
	}
}
