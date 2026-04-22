import { UnitTest } from "../../types/UnitTest";
import { updateJoinAliases, updateWhereAlias } from "../../../src/repo/utils/include-resolver";
import { WhereGroup } from "../../../src/sqb/kadmium-sqb";
import { JoinOptions } from "../../../src/repo/types/query";

export class IncludeAliasTest extends UnitTest {
	constructor() {
		super("updateJoinAliases on .as() alias change");
	}

	protected async runImpl(): Promise<void> {
		this.test_updateWhereAlias();
		this.test_updateJoinAliases();
		this.test_nestedWhereGroup();
	}

	private test_updateWhereAlias(): void {
		const group: WhereGroup = {
			op: "AND",
			conditions: [
				{ alias: "posts", field: "title", op: "=", value: "Test" },
			],
		};

		updateWhereAlias(group, "posts", "p");

		const cond = group.conditions[0] as any;
		if (cond.alias !== "p") throw new Error("Alias should be 'p', got: " + cond.alias);
	}

	private test_updateJoinAliases(): void {
		const joins: JoinOptions[] = [
			{
				left: "u",
				right: "p",
				direction: "inner",
				on: { alias: "u", field: "id", op: "=", value: null },
			},
		];

		updateJoinAliases(joins, "u", "users");

		const on = joins[0].on as any;
		if (on.alias !== "users") throw new Error("Join alias should be 'users', got: " + on.alias);
	}

	private test_nestedWhereGroup(): void {
		const group: WhereGroup = {
			op: "AND",
			conditions: [
				{
					op: "OR",
					conditions: [
						{ alias: "old", field: "a", op: "=", value: 1 },
						{ alias: "old", field: "b", op: "=", value: 2 },
					],
				},
			],
		};

		updateWhereAlias(group, "old", "new");

		const nested = group.conditions[0] as WhereGroup;
		const c1 = nested.conditions[0] as any;
		const c2 = nested.conditions[1] as any;

		if (c1.alias !== "new") throw new Error("Nested alias should be 'new'");
		if (c2.alias !== "new") throw new Error("Nested alias should be 'new'");
	}
}
