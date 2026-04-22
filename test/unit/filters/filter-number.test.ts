import { UnitTest } from "../../types/UnitTest";
import { NumberFilterBuilder } from "../../../src/repo/field-builders/number-filter.builder";
import { IS_FILTER_BUILDER } from "../../../src/repo/symbols";
import { KadmiumSqb } from "../../../src/sqb/kadmium-sqb";
import { AnyModel } from "../../../src/model/model";

interface TestModel extends AnyModel {
	_meta: "generated-schema";
	age: number;
	price: number;
}

export class NumberFilterTest extends UnitTest {
	constructor() {
		super("NumberFilterBuilder methods");
	}

	protected async runImpl(): Promise<void> {
		this.test_hasSymbol();
		this.test_gt();
		this.test_gte();
		this.test_lt();
		this.test_lte();
		this.test_between();
		this.test_in();
	}

	private createBuilder(): NumberFilterBuilder<TestModel, "age"> {
		const mockSqb = { _wheres: { op: "AND" as const, conditions: [] } } as unknown as KadmiumSqb<TestModel>;
		return new NumberFilterBuilder(mockSqb, "age", "u");
	}

	private test_hasSymbol(): void {
		const builder = this.createBuilder();
		if (!builder[IS_FILTER_BUILDER]) throw new Error("Should have IS_FILTER_BUILDER symbol");
	}

	private test_gt(): void {
		const cond = this.createBuilder().gt(18);
		if (cond.op !== ">") throw new Error("gt should use >");
		if (cond.value !== 18) throw new Error("gt value mismatch");
	}

	private test_gte(): void {
		const cond = this.createBuilder().gte(18);
		if (cond.op !== ">=") throw new Error("gte should use >=");
	}

	private test_lt(): void {
		const cond = this.createBuilder().lt(100);
		if (cond.op !== "<") throw new Error("lt should use <");
	}

	private test_lte(): void {
		const cond = this.createBuilder().lte(100);
		if (cond.op !== "<=") throw new Error("lte should use <=");
	}

	private test_between(): void {
		const cond = this.createBuilder().between(10, 20);
		if (cond.op !== "BETWEEN") throw new Error("between should use BETWEEN");
		if (cond.value !== "10 AND 20") throw new Error("between value should be '10 AND 20', got: " + cond.value);
	}

	private test_in(): void {
		const cond = this.createBuilder().in([1, 2, 3]);
		if (cond.op !== "IN") throw new Error("in should use IN");
		const vals = cond.value as number[];
		if (vals.length !== 3) throw new Error("in should have 3 values");
	}
}
