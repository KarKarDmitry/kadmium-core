import { UnitTest } from "../../types/UnitTest";
import { Schema } from "../../../src/schema/engine/schema";

export class SchemaValidationTest extends UnitTest {
	constructor() {
		super("Schema validation at declaration");
	}

	protected async runImpl(): Promise<void> {
		this.test_missingCollection();
		this.test_missingPrimary();
		this.test_missingPrimaryName();
		this.test_missingPrimaryDbType();
		this.test_missingForm();
		this.test_validSchema();
	}

	private makeOpt(overrides: Partial<any> = {}): any {
		return {
			collection: "test",
			version: "1.0",
			primary: { _meta: "field", type: "primary", name: "id", label: "ID", db_type: "uuid" as const },
			form: { sections: [] },
			is_active: true,
			...overrides,
		};
	}

	private test_missingCollection(): void {
		try {
			Schema.from(this.makeOpt({ collection: "" }));
			throw new Error("Should have thrown for empty collection");
		} catch (e: any) {
			if (e.message === "Should have thrown for empty collection") throw e;
		}
	}

	private test_missingPrimary(): void {
		try {
			Schema.from(this.makeOpt({ primary: null }));
			throw new Error("Should have thrown for missing primary");
		} catch (e: any) {
			if (e.message === "Should have thrown for missing primary") throw e;
			if (!e.message.includes("primary")) throw new Error("Expected primary error, got: " + e.message);
		}
	}

	private test_missingPrimaryName(): void {
		try {
			Schema.from(this.makeOpt({
				primary: { _meta: "field", type: "primary", name: "", label: "ID", db_type: "uuid" },
			}));
			throw new Error("Should have thrown for missing primary name");
		} catch (e: any) {
			if (e.message === "Should have thrown for missing primary name") throw e;
			if (!e.message.includes("name")) throw new Error("Expected primary name error");
		}
	}

	private test_missingPrimaryDbType(): void {
		try {
			Schema.from(this.makeOpt({
				primary: { _meta: "field", type: "primary", name: "id", label: "ID", db_type: "" },
			}));
			throw new Error("Should have thrown for missing primary db_type");
		} catch (e: any) {
			if (e.message === "Should have thrown for missing primary db_type") throw e;
			if (!e.message.includes("db_type")) throw new Error("Expected db_type error");
		}
	}

	private test_missingForm(): void {
		try {
			Schema.from(this.makeOpt({ form: null }));
			throw new Error("Should have thrown for missing form");
		} catch (e: any) {
			if (e.message === "Should have thrown for missing form") throw e;
			if (!e.message.includes("form")) throw new Error("Expected form error");
		}
	}

	private test_validSchema(): void {
		Schema.from(this.makeOpt());
	}
}
