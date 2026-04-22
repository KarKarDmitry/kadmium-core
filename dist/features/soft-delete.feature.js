"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoftDeleteFeature = void 0;
const base_feature_1 = require("./types/base.feature");
const init_1 = require("../schema/init");
const model_1 = require("../model/model");
class SoftDeleteAmend extends model_1.AnyModel {
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
class SoftDeleteFeature extends base_feature_1.KadmiumFeature {
    constructor() {
        super(...arguments);
        // Выполняется первым — может менять операцию delete → update
        this.priority = -100;
        this.hooks = {
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
    amendSchema() {
        return {
            fields: [
                (0, init_1.datetime)({
                    name: "deleted_at",
                    label: "Deleted At",
                    required: false,
                    db: { nullable: true, index: true },
                }),
            ],
        };
    }
}
exports.SoftDeleteFeature = SoftDeleteFeature;
//# sourceMappingURL=soft-delete.feature.js.map