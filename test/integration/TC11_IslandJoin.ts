import { IntegrationTestCase } from "../types/IntegrationTestCase";
import { KadmiumApp } from "../../src/kadmium-app";
import { Department } from "../../src/models/schemas/Department";
import { Post_tag } from "../../src/models/schemas/Post_tag";
import { Post } from "../../src/models/schemas/Post";
import { Tag } from "../../src/models/schemas/Tag";
import { User } from "../../src/models/schemas/User";

export class TC11_IslandJoin extends IntegrationTestCase {
	constructor(app: KadmiumApp) {
		super(app, "Island Join - Find SQL posts AND Dev users");
	}

	protected async runImpl(): Promise<void> {
		const islandQuery = await this.app.Repo.query({
			p: Post,
			pt: Post_tag,
			t: Tag, // Island 1
			u: User,
			d: Department, // Island 2
		})
			.join({ left: "p", right: "pt", on: (t) => t.p.id.eq(t.pt.post_id) })
			.join({ left: "pt", right: "t", on: (t) => t.pt.tag_id.eq(t.t.id) })
			.join({ left: "u", right: "d", on: (t) => t.u.department_id.eq(t.d.id) })
			.where((t) => t.t.name.eq("SQL"))
			.and((t) => t.d.name.eq("Developers"))
			.select((t) => [t.p.title, t.u.first_name])
			.go();

		// Expected: Cartesian product of (2 SQL posts) x (2 Dev users) = 4 rows
		if (islandQuery.length !== 4) {
			throw new Error(
				`Expected 4 rows from CROSS JOIN, but got ${islandQuery.length}`,
			);
		}

		const devNames = islandQuery.map((r: any) => r.u.first_name);
		if (!devNames.includes("Alice") || !devNames.includes("Bob")) {
			throw new Error(`Did not find expected users in CROSS JOIN result.`);
		}
	}
}
