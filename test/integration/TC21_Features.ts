import { IntegrationTestCase } from "../types/IntegrationTestCase";
import { KadmiumApp } from "../../src/kadmium-app";
import { Post } from "../../src/models/schemas/Post";
import { User } from "../../src/models/schemas/User";
import { AuditFeature } from "../../src/features/audit.feature";
import { KadmiumFeature } from "../../src/features/types/base.feature";
import { HookContext } from "../../src/features/types";
import {
	schema,
	form,
	string,
	primary,
	sections as s,
} from "../../src/schema/init";
import { AnyModel } from "../../src/model/model";
import { Schema } from "../../src/schema/engine/schema";

/**
 * TC21 — тестирование Features Architecture (new CRUD hooks).
 *
 * Проверяет:
 * 1. amendSchema — поля добавлены в registry
 * 2. beforeCreate — created_at/updated_at заполняются
 * 3. beforeUpdate — updated_at обновляется
 * 4. abort — фича может прервать операцию
 */
export class TC21_Features extends IntegrationTestCase {
	constructor(app: KadmiumApp) {
		super(app, "Features Architecture");
	}

	protected async runImpl(): Promise<void> {
		console.log("--- Features Architecture Tests ---");

		const postRepo = this.app.Repo.get(Post);
		const userRepo = this.app.Repo.get(User);

		// Добавляем audit-колонки в таблицу post
		await this.app.Repo.raw(
			`ALTER TABLE "post" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;`,
		).go();
		await this.app.Repo.raw(
			`ALTER TABLE "post" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;`,
		).go();

		// ── 1. amendSchema — AuditFeature добавил поля в registry ──
		const schemaCore = this.app.appCore.schemas.find(
			(s) => s.collection === "post",
		);
		if (!schemaCore) throw new Error("1. Post schema not found.");
		if (schemaCore.features.length === 0)
			throw new Error("1. Post schema has no features.");
		if (!(schemaCore.features[0] instanceof AuditFeature))
			throw new Error("1. First feature is not AuditFeature.");

		const hasCreatedAt = schemaCore.registry.fieldsByName.has("created_at");
		const hasUpdatedAt = schemaCore.registry.fieldsByName.has("updated_at");
		if (!hasCreatedAt)
			throw new Error("1. amendSchema() did not add created_at field.");
		if (!hasUpdatedAt)
			throw new Error("1. amendSchema() did not add updated_at field.");
		console.log(
			"1. amendSchema: created_at and updated_at fields added to registry.",
		);

		// ── 2. beforeCreate — created_at/updated_at заполняются ──
		const testUser = await userRepo
			.create({
				first_name: "FeatureTest",
				last_name: "User",
				email: `feature.test.${Date.now()}@example.com`,
				username: `featuretest${Date.now()}`,
				password: "securepassword",
				confirm_password: "securepassword",
			})
			.go();

		const beforeCreate = Date.now();
		const newPost = await postRepo
			.create({
				title: "Feature Test Post",
				author_id: testUser.id,
				is_published: false,
			})
			.go();
		const afterCreate = Date.now();

		if (!newPost) throw new Error("2. Post creation failed.");

		const postWithAudit = await postRepo
			.where((p) => p.id.eq(newPost.id))
			.first({ includeSecured: true })
			.go();

		if (!postWithAudit?.created_at)
			throw new Error("2. created_at was not set by beforeCreate hook.");
		if (!postWithAudit?.updated_at)
			throw new Error("2. updated_at was not set by beforeCreate hook.");

		const createdAtMs = new Date(postWithAudit.created_at).getTime();
		if (createdAtMs < beforeCreate - 5000 || createdAtMs > afterCreate + 5000) {
			throw new Error(`2. created_at timestamp is out of range.`);
		}
		console.log(
			`2. beforeCreate on create: created_at=${postWithAudit.created_at}, updated_at=${postWithAudit.updated_at}`,
		);

		// ── 3. beforeUpdate — updated_at обновляется ──
		const beforeUpdate = Date.now();
		await postRepo
			.where((p) => p.id.eq(newPost.id))
			.update({ title: "Updated Feature Test Post" })
			.go();

		const postAfterUpdate = await postRepo
			.where((p) => p.id.eq(newPost.id))
			.first({ includeSecured: true })
			.go();

		if (!postAfterUpdate?.updated_at)
			throw new Error("3. updated_at was not updated.");

		const updatedAtMs = new Date(postAfterUpdate.updated_at).getTime();
		if (updatedAtMs < beforeUpdate - 1000) {
			throw new Error(`3. updated_at was not updated.`);
		}
		console.log(
			`3. beforeUpdate on update: updated_at=${postAfterUpdate.updated_at}`,
		);

		// ── 4. abort — фича может прервать операцию ──
		let abortCalled = false;
		class AbortFeature extends KadmiumFeature {
			hooks = {
				beforeCreate: [(ctx: HookContext) => {
					if (ctx.getData("should_abort")) {
						abortCalled = true;
						ctx.abort("Test abort");
					}
				}],
			};
		}

		const abortSchema = schema({
			collection: "abort_test",
			version: "0.1",
			primary: primary({ name: "id", db_type: "uuid", label: "ID" }),
			form: form({
				sections: [
					s.block({
						key: "main",
						fields: [string({ name: "value", label: "Value", required: true })],
					}),
				],
			}),
			features: [AbortFeature],
		});

		this.app.registerSchema(Schema.from(abortSchema));
		const abortSchemaCore = this.app.appCore.schemas.find(
			(s) => s.collection === "abort_test",
		)!;

		// Создаём таблицу для теста
		await this.app.Repo.raw(
			`DROP TABLE IF EXISTS "abort_test"; CREATE TABLE "abort_test" (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), value VARCHAR, should_abort BOOLEAN)`,
		).go();

		// Определяем тип для repo (имя класса должно совпадать с collection name)
		class abort_test implements AnyModel {
			_meta = "generated-schema" as const;
			id!: string;
			value!: string;
			should_abort?: boolean;
		}

		const abortRepoInstance = this.app.Repo.get(abort_test as any);

		try {
			await abortRepoInstance
				.create({
					id: "a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0",
					value: "test",
					should_abort: true,
				} as any)
				.go();
			throw new Error("4. Abort should have thrown.");
		} catch (e: any) {
			if (!e?.message.includes("aborted")) throw e;
		}
		if (!abortCalled) throw new Error("4. Abort callback was not called.");
		console.log("4. abort() — feature successfully aborted operation.");

		// Cleanup
		await this.app.Repo.raw(`DROP TABLE IF EXISTS "abort_test"`).go();

		console.log("--- Features Architecture Tests PASSED ---");
	}
}
