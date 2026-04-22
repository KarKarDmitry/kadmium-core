import { IntegrationTestCase } from "../types/IntegrationTestCase";
import { KadmiumApp } from "../../src/kadmium-app";
import { Post } from "../../src/models/schemas/Post";
import { User } from "../../src/models/schemas/User";

export class TC9_AdvancedBuilders extends IntegrationTestCase {
	constructor(app: KadmiumApp) {
		super(app, "Advanced Builders (Date & Nullable)");
	}

	protected async runImpl(): Promise<void> {
		const postRepo = this.app.Repo.get(Post);
		const userRepo = this.app.Repo.get(User);
		const yesterday = new Date(Date.now() - 86400 * 1000);

		// Part 1: DateFilterBuilder
		const recentPosts = await postRepo
			.where((p) => p.published_at.after(yesterday))
			.select((p, { }) => [p.title])
			.go();
		if (recentPosts.length !== 2) {
			throw new Error(
				`TEST 9.1 FAILED: Expected 2 recent posts, but got ${recentPosts.length}.`,
			);
		}

		// Part 2: Nullable check (notNull)
		const usersWithMiddleName = await userRepo
			.where((u) => u.middle_name.notNull)
			.select((u, { }) => [u.first_name])
			.go();

		if (
			usersWithMiddleName.length !== 1 ||
			(usersWithMiddleName[0] as any).first_name !== "Charlie"
		) {
			throw new Error(
				`TEST 9.2 FAILED: Expected 1 user with middle name, but got ${usersWithMiddleName.length}.`,
			);
		}

		// Part 3: Nullable check (null)
		const postsNotYetPublished = await postRepo
			.where((p) => p.published_at.null)
			.select((p, { }) => [p.title])
			.go();
		if (postsNotYetPublished.length !== 2) {
			throw new Error(
				`TEST 9.3 FAILED: Expected 2 posts with null publish date, but got ${postsNotYetPublished.length}.`,
			);
		}
	}
}
