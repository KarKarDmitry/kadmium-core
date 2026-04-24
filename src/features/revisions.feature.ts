import { KadmiumFeature, FeatureHooks } from "./types/base.feature";
import { HookContext } from "./types";
import {
	schema,
	form,
	string,
	ref,
	datetime,
	primary,
	jsonb,
	sections as s,
} from "../schema";
import { controller, get } from "../controller/init";
import { ControllerInstance } from "../controller/types/controller";
import { ControllerContext } from "../route/types/context";
import { FeatureModel } from "../model/types";

/**
 * Revision — модель ревизий, определяемая вручную разработчиком.
 *
 * Наследуется от FeatureModel, содержит поля и схему через _conf_.schema.
 * Генератор распознаёт такие классы и генерирует полноценную модель
 * в src/models/features/Revision.ts.
 */
export class Revision extends FeatureModel {
	id!: number;
	target_table!: string;
	target_id!: string;
	data!: Record<string, unknown>;
	changed_fields!: string;
	changed_at!: Date;
	changed_by!: string;

	_conf_ = {
		schema: schema({
			collection: "revision",
			folder: "features",
			version: "1.0",
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
						title: "Revision",
						fields: [
							string({
								name: "target_table",
								label: "Target Table",
								required: true,
								db: { index: true },
							}),
							string({
								name: "target_id",
								label: "Target ID",
								required: true,
								db: { index: true },
							}),
							jsonb({
								name: "data",
								label: "Data Snapshot",
								required: false,
							}),
							string({
								name: "changed_fields",
								label: "Changed Fields",
								required: false,
							}),
							datetime({
								name: "changed_at",
								label: "Changed At",
								required: false,
								db: { index: true },
							}),
							ref({
								name: "changed_by",
								label: "Changed By",
								ref: "user",
								required: false,
							}),
						],
					}),
				],
			}),
		}),
	};
}


/**
 * RevisionsFeature — отслеживает историю изменений записей.
 *
 * При подключении к схеме:
 * 1. При каждом update/create записывает снимок данных в таблицу revision
 * 2. Регистрирует контроллер /revisions/:table/:id
 *
 * Использование в другом коде:
 *   RevisionsFeature.ensureEnabled("post");
 */
export class RevisionsFeature extends KadmiumFeature<Revision> {
	// Выполняется последним — должен видеть финальные данные
	priority: number = 100;

	/**
	 * Модель ревизий — используется базовой реализацией createSchemas().
	 */
	protected readonly ModelClass = Revision;

	/**
	 * Set схем, для которых фича подключена.
	 */
	static readonly registeredSchemas = new Set<string>();

	constructor(protected core: import("../core/schema-core").SchemaCore) {
		super(core);
		RevisionsFeature.registeredSchemas.add(core.collection);
	}

	/**
	 * Регистрирует схему revision через FeatureModel.
	 */
	createSchemas() {
		return super.createSchemas();
	}

	/**
	 * Проверяет, что ревизии подключены для схемы.
	 */
	static ensureEnabled(collection: string) {
		if (!this.registeredSchemas.has(collection)) {
			throw Object.assign(
				new Error(`Ревизии не подключены для схемы "${collection}"`),
				{ statusCode: 400 },
			);
		}
	}

	/**
	 * Хуки — записываем ревизию после create/update.
	 */
	hooks: FeatureHooks<Revision> = {
		afterCreate: [(result, ctx) => {
			this._saveRevision(result, ctx);
		}],
		afterUpdate: [(results, ctx) => {
			for (const result of results) {
				this._saveRevision(result, ctx);
			}
		}],
	};

	/**
	 * Контроллер для доступа к ревизиям.
	 */
	controllers = [
		controller(Revision, [
			get("/revisions/:table/:id", async (ctx) => {
				RevisionsFeature.ensureEnabled(ctx.request.params.table);

				const rows = await ctx.repo
					.select()
					.where((r) => r.target_table.eq(ctx.request.params.table))
					.and((r) => r.target_id.eq(ctx.request.params.id))
					.order((r) => r.changed_at, "desc")
					.go();

				return rows;
			}),
		]),

	];

	private async _saveRevision(result: any, ctx: HookContext<Revision>) {
		const changedFields = Object.keys(result ?? {});

		await ctx.repo
			.get(Revision)
			.create({
				target_table: this.core.collection,
				target_id: String(result[this.core.normalized.primary.name] ?? ""),
				data: result,
				changed_fields: JSON.stringify(changedFields),
				changed_at: new Date(),
				changed_by: (ctx as any).user?.id,
			} as any)
			.go()
			.catch(() => {
				// Не ломаем основную операцию если ревизия не записалась
			});
	}
}
