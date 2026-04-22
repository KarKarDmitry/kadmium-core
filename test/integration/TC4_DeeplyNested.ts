import { IntegrationTestCase } from "../types/IntegrationTestCase";
import { KadmiumApp } from "../../src/kadmium-app";
import { Post } from "../../src/models/schemas/Post";
import { User } from "../../src/models/schemas/User";

export class TC4_DeeplyNested extends IntegrationTestCase {
	constructor(app: KadmiumApp) {
		super(app, "Deeply nested AND/OR groups");
	}

	protected async runImpl(): Promise<void> {
		const veryComplexQuery = await this.app.Repo.query({ p: Post, u: User })
			.join({ left: "p", right: "u", on: (t) => t.p.author_id.eq(t.u.id) })
			.where([
				(q) => {
					q.where([
						(g1) => {
							g1.where((t) => t.p.is_published.eq(true)).and([
								(g2) => {
									g2.where((t) => t.u.first_name.eq("Alice")).or((t) =>
										t.u.first_name.eq("Bob"),
									);
								},
							]);
						},
					]).or([
						(g3) => {
							g3.where((t) => t.p.is_published.eq(false)).and((t) =>
								t.u.last_name.eq("Admin"),
							);
						},
					]);
				},
			])
			.select((t) => [t.p.title])
			.go();

		const veryComplexTitles = veryComplexQuery
			.map((row: any) => row.p.title)
			.sort();
		const expectedTitles = [
			"Alice's Private Draft",
			"Alice's Public Post",
			"Bob's News (Published)",
			"Charlie's Draft",
		].sort();
		if (JSON.stringify(veryComplexTitles) !== JSON.stringify(expectedTitles)) {
			throw new Error("Fetched incorrect posts.");
		}
	}
}
