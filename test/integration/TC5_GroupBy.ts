import { IntegrationTestCase } from "../types/IntegrationTestCase";
import { KadmiumApp } from "../../src/kadmium-app";
import { Post } from "../../src/models/schemas/Post";
import { User } from "../../src/models/schemas/User";

export class TC5_GroupBy extends IntegrationTestCase {
	constructor(app: KadmiumApp) {
		super(app, "GROUP BY and Aggregates");
	}

	protected async runImpl(): Promise<void> {
		const postsPerUser = await this.app.Repo.query({ u: User, p: Post })
			.join({ left: "p", right: "u", on: (t) => t.p.author_id.eq(t.u.id) })
			.groupBy((t) => [t.u.id, t.u.first_name])
			.select((t, { count }) => [
				t.u.first_name,
				count(t.p.id).as("post_count"),
			])
			.go();

		if (postsPerUser.length !== 4) {
			throw new Error(
				`Expected 4 users with posts, but got ${postsPerUser.length}`,
			);
		}

		const aliceData = postsPerUser.find(
			(row: any) => row.u.first_name === "Alice",
		);
		if (!aliceData || aliceData.post_count != 2) {
			throw new Error(
				`Alice should have 2 posts, but found ${aliceData?.post_count ?? "undefined"
				}.`,
			);
		}

		const bobData = postsPerUser.find((row: any) => row.u.first_name === "Bob");
		if (!bobData || bobData.post_count != 1) {
			throw new Error(
				`Bob should have 1 post, but found ${bobData?.post_count ?? "undefined"
				}.`,
			);
		}
	}
}
