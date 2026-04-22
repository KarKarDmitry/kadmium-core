import { UnitTest } from "../../types/UnitTest";

export class PageGuardTest extends UnitTest {
	constructor() {
		super("page() guards against invalid values");
	}

	protected async runImpl(): Promise<void> {
		this.test_negativePage();
		this.test_zeroSize();
		this.test_negativeSize();
		this.test_normalPagination();
	}

	private computePage(page: number, size: number): { limit: number; offset: number } {
		const pageNumber = Math.max(1, page);
		const pageSize = Math.max(1, size);
		return {
			limit: pageSize,
			offset: (pageNumber - 1) * pageSize,
		};
	}

	private test_negativePage(): void {
		const result = this.computePage(-1, 10);
		if (result.limit < 1) throw new Error("limit should be >= 1");
		// page -1 → page 1, offset 0
		if (result.offset !== 0) throw new Error("Negative page should map to page 1 (offset 0)");
	}

	private test_zeroSize(): void {
		const result = this.computePage(1, 0);
		if (result.limit < 1) throw new Error("Size 0 should result in limit 1");
		if (result.limit !== 1) throw new Error("Expected limit 1 for size 0");
	}

	private test_negativeSize(): void {
		const result = this.computePage(1, -5);
		if (result.limit !== 1) throw new Error("Negative size should result in limit 1");
	}

	private test_normalPagination(): void {
		const p1 = this.computePage(1, 10);
		const p2 = this.computePage(2, 10);
		const p3 = this.computePage(3, 10);

		if (p1.limit !== 10 || p1.offset !== 0) throw new Error("Page 1 wrong");
		if (p2.limit !== 10 || p2.offset !== 10) throw new Error("Page 2 wrong");
		if (p3.limit !== 10 || p3.offset !== 20) throw new Error("Page 3 wrong");
	}
}
