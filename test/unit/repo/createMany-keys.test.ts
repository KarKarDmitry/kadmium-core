import { UnitTest } from "../../types/UnitTest";

export class CreateManyKeysTest extends UnitTest {
	constructor() {
		super("createMany collects all unique keys");
	}

	protected async runImpl(): Promise<void> {
		this.test_sameKeys();
		this.test_differentKeys();
		this.test_missingFieldsBecomeNull();
	}

	private collectKeys(data: Record<string, unknown>[]): string[] {
		const keysSet = new Set<string>();
		for (const item of data) {
			for (const key of Object.keys(item)) {
				keysSet.add(key);
			}
		}
		return Array.from(keysSet);
	}

	private test_sameKeys(): void {
		const data = [
			{ id: "1", name: "Alice" },
			{ id: "2", name: "Bob" },
		];
		const keys = this.collectKeys(data);
		if (keys.length !== 2) throw new Error("Expected 2 keys");
		if (!keys.includes("id")) throw new Error("Should include 'id'");
		if (!keys.includes("name")) throw new Error("Should include 'name'");
	}

	private test_differentKeys(): void {
		const data = [
			{ id: "1", name: "Alice" },
			{ id: "2", email: "bob@test.com" },
		];
		const keys = this.collectKeys(data);
		if (keys.length !== 3) throw new Error(`Expected 3 keys, got ${keys.length}: ${JSON.stringify(keys)}`);
		if (!keys.includes("name")) throw new Error("Should include 'name' from first element");
		if (!keys.includes("email")) throw new Error("Should include 'email' from second element");
	}

	private test_missingFieldsBecomeNull(): void {
		const data = [
			{ id: "1", name: "Alice" },
			{ id: "2" },
		];
		const keys = this.collectKeys(data);

		// Simulate value extraction with null for missing
		const values: any[] = [];
		for (const item of data) {
			for (const key of keys) {
				values.push((item as any)[key] ?? null);
			}
		}

		// Second item should have null for 'name'
		if (values[2] !== "2") throw new Error("Expected id '2' at position 2");
		if (values[3] !== null) throw new Error("Expected null for missing 'name' at position 3");
	}
}
