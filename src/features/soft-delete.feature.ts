import { KadmiumFeature, FeatureHooks } from "./types/base.feature.js";
import { HookContext } from "./types/index.js";
import { datetime } from "../schema/dsl.js";
import { AnyModel } from "../model/model.js";


abstract class SoftDeleteAmend extends AnyModel {
	deleted_at!: Date | null;
}

/**
 * SoftDeleteFeature — мягкое удаление записей.
 *
 * Вместо физического удаления устанавливает `deleted_at`.
 * Автоматически фильтрует удалённые записи из select-запросов.
 *
 * Использование в схеме:
 *   features: [SoftDeleteFeature],
 */
export class SoftDeleteFeature extends KadmiumFeature {
	// Выполняется первым — может менять операцию delete → update
	priority: number = -100;

	amendSchema() {
		return {
			fields: [
				datetime({
					name: "deleted_at",
					label: "Deleted At",
					required: false,
					db: { nullable: true, index: true },
				}),
			],
		};
	}

	hooks: FeatureHooks<SoftDeleteAmend> = {
		beforeDelete: [(ctx) => {
			// Вместо DELETE делаем UPDATE с deleted_at
			ctx.operation = "update";
			ctx.setData("deleted_at", new Date());
		}],
		beforeRead: [(ctx) => {
			// Исключаем удалённые записи
			ctx.where((f) => f.deleted_at.null);
		}],
	};
}
