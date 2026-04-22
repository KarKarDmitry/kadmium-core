import { UnitTest } from "../../types/UnitTest";
import { createHookFieldSelector, FieldSelector } from "../../../src/repo/utils/hook-filter-proxy";
import { WhereCondition } from "../../../src/sqb/kadmium-sqb";
import { AnyModel } from "../../../src/model/model";

interface TestModel extends AnyModel {
	_meta: "generated-schema";
	id: string;
	title: string;
	price: number;
	quantity: number;
	tags: string[];
}

export class HookFilterProxyTest extends UnitTest {
	constructor() {
		super("Hook filter proxy methods coverage");
	}

	protected async runImpl(): Promise<void> {
		this.test_eq();
		this.test_ne();
		this.test_in();
		this.test_like();
		this.test_getters_returnProxy();
	}

	private createProxy(wheres: WhereCondition[], alias?: string): FieldSelector<TestModel> {
		return createHookFieldSelector<TestModel>(alias, wheres);
	}

	private test_eq(): void {
		const wheres: WhereCondition[] = [];
		const f = this.createProxy(wheres);

		f.title.eq("Hello");
		if ((wheres[0].op as string) !== "=") throw new Error("eq should use =");
		if (wheres[0].value !== "Hello") throw new Error("eq value mismatch");
	}

	private test_ne(): void {
		const wheres: WhereCondition[] = [];
		const f = this.createProxy(wheres);

		f.title.ne("World");
		if ((wheres[0].op as string) !== "!=") throw new Error("ne should use !=");
	}

	private test_in(): void {
		const wheres: WhereCondition[] = [];
		const f = this.createProxy(wheres);

		f.title.in(["A", "B", "C"]);
		if ((wheres[0].op as string) !== "IN") throw new Error("in should use IN");
		const vals = wheres[0].value as string[];
		if (vals.length !== 3) throw new Error("in should have 3 values");
	}

	private test_like(): void {
		const wheres: WhereCondition[] = [];
		const f = this.createProxy(wheres);

		f.title.like("%test%");
		if ((wheres[0].op as string) !== "LIKE") throw new Error("like should use LIKE");
		if (wheres[0].value !== "%test%") throw new Error("like value mismatch");
	}

	private test_getters_returnProxy(): void {
		const wheres: WhereCondition[] = [];
		const f = this.createProxy(wheres);

		// .null and .notNull are getters that push a condition
		f.title.null;
		if (wheres.length !== 1) throw new Error(".null should push 1 condition");
	}
}
