import { KadmiumApp } from "../../src/kadmium-app";
import { Post } from "../../src/models/schemas/Post";
import { User } from "../../src/models/schemas/User";
import { IntegrationTestCase } from "../types/IntegrationTestCase";

export class TC1_SimpleOR extends IntegrationTestCase {
	constructor(app: KadmiumApp) {
		super(app, "Simple OR");
	}

	protected async runImpl(): Promise<void> {
		const draftOrBobPosts = await this.app.Repo.query({ u: User, p: Post })
			.join({ left: "p", right: "u", on: (t) => t.p.author_id.eq(t.u.id) })
			.group((q) => q.where((t) => t.p.is_published.eq(false)).or((t) => t.u.first_name.eq("Bob")),)
			.select((t) => [t.p.title])
			.go();

		if (draftOrBobPosts.length !== 3) {
			throw new Error(`Expected 3 posts, but got ${draftOrBobPosts.length}`);
		}
	}
}
