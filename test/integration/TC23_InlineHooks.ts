import { IntegrationTestCase } from "../types/IntegrationTestCase";
import { KadmiumApp } from "../../src/kadmium-app";
import { Schema } from "../../src/schema/engine/schema";
import {
	schema,
	form,
	string,
	number,
	primary,
	sections as s,
} from "../../src/schema/init";
import { Model, ModelConfig, AnyModel } from "../../src/model/model";
import { PUBLIC_TYPE_SYMBOL, RELATIONS_SYMBOL } from "../../src/repo/symbols";

/**
 * TC23 — тестирование inline model hooks (_conf_.hooks).
 *
 * Проверяет все 8 хуков модели:
 * 1. beforeCreate — uppercases name, value+10
 * 2. afterCreate — appends _AFTER_CREATE
 * 3. beforeRead — no-op
 * 4. afterRead — appends _AFTER_READ
 * 5. beforeUpdate — uppercases name
 * 6. afterUpdate — appends _AFTER_UPDATE
 * 7. beforeDelete — no-op
 * 8. afterDelete — no-op
 */

class InlineTest extends Model {
	_meta: "generated-schema" = "generated-schema";
	static readonly _collection = "inline_test";
	[PUBLIC_TYPE_SYMBOL]!: InlineTest;
	[RELATIONS_SYMBOL]!: never;

	id!: number;
	name!: string;
	value!: number | null;

	_conf_: ModelConfig<this> = {
		hooks: {
			beforeCreate: [
				(ctx) => {
					ctx.data.name = (ctx.data.name || "").toUpperCase();
					if (ctx.data.value !== undefined) {
						ctx.data.value = (ctx.data.value || 0) + 10;
					}
				},
			],
			afterCreate: [
				(ctx) => {
					ctx.data.name = (ctx.data.name || "") + "_AFTER_CREATE";
				},
			],
			beforeRead: [],
			afterRead: [
				(ctx) => {
					ctx.data.name = (ctx.data.name || "") + "_AFTER_READ";
				},
			],
			beforeUpdate: [
				(ctx) => {
					ctx.data.name = (ctx.data.name || "").toUpperCase();
				},
			],
			afterUpdate: [
				(ctx) => {
					ctx.data.name = (ctx.data.name || "") + "_AFTER_UPDATE";
				},
			],
			beforeDelete: [],
			afterDelete: [],
		},
		validation: { rules: [] },
		features: [],
	};
}

const inlineTestSchema = schema({
	collection: "inline_test",
	version: "0.1",
	primary: primary({
		name: "id",
		label: "ID",
		db_type: "number",
		auto_increment: true,
	}),
	form: form({
		sections: [
			s.block({
				key: "main",
				title: "Inline Test",
				fields: [
					string({
						name: "name",
						label: "Name",
						required: true,
					}),
					number({
						name: "value",
						label: "Value",
						required: false,
					}),
				],
			}),
		],
	}),
});

export class TC23_InlineHooks extends IntegrationTestCase {
	constructor(app: KadmiumApp) {
		super(app, "Inline Model Hooks Test");
	}

	protected async runImpl(): Promise<void> {
		console.log("--- Inline Model Hooks Tests ---");

		// ── 0. Регистрация схемы ──
		this.app.registerSchema(Schema.from(inlineTestSchema));
		await this.app.Repo.raw(
			`DROP TABLE IF EXISTS "inline_test"; CREATE TABLE "inline_test" (id SERIAL PRIMARY KEY, name VARCHAR NOT NULL, value INTEGER)`,
		).go();

		const repo = this.app.Repo.get(InlineTest);

		// ── 1. CREATE: beforeCreate + afterCreate ──
		const created = await repo.create({ name: "test_item", value: 5 }).go();
		if (created.name !== "TEST_ITEM_AFTER_CREATE") {
			throw new Error(
				`1. expected "TEST_ITEM_AFTER_CREATE", got "${created.name}"`,
			);
		}
		if (created.value !== 15) {
			throw new Error(`1. expected value 15, got ${created.value}`);
		}
		console.log("   1. beforeCreate+afterCreate: OK");

		// ── 2. READ: afterRead ──
		const selected = await repo.select().go();
		if (selected.length !== 1) throw new Error(`2. expected 1 item`);
		if (!selected[0].name.includes("_AFTER_READ")) {
			throw new Error(`2. afterRead failed: ${selected[0].name}`);
		}
		console.log("   2. afterRead: OK");

		// ── 3. UPDATE: beforeUpdate + afterUpdate ──
		const updated = await repo
			.update({ name: "updated_name" })
			.where((e) => e.id.eq(created.id))
			.go();
		if (updated.length !== 1) throw new Error(`3. expected 1 updated item`);
		if (updated[0].name !== "UPDATED_NAME_AFTER_UPDATE") {
			throw new Error(
				`3. expected "UPDATED_NAME_AFTER_UPDATE", got "${updated[0].name}"`,
			);
		}
		console.log("   3. beforeUpdate+afterUpdate: OK");

		// ── 4. DELETE: beforeDelete + afterDelete ──
		const deleted = await repo
			.delete()
			.where((e) => e.id.eq(created.id))
			.go();
		if (!deleted) throw new Error(`4. delete() returned false`);
		console.log("   4. beforeDelete+afterDelete: OK");

		// ── 5. VERIFY ──
		const remaining = await repo.select().go();
		if (remaining.length !== 0) throw new Error(`5. expected 0 items`);
		console.log("   5. Verify deletion: OK");

		await this.app.Repo.raw(`DROP TABLE IF EXISTS "inline_test"`).go();
		console.log("--- Inline Model Hooks Tests PASSED ---");
	}
}
