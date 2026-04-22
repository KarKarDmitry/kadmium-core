"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditFeature = void 0;
const base_feature_1 = require("./types/base.feature");
const init_1 = require("../schema/init");
const model_1 = require("../model/model");
class AuditAmend extends model_1.Model {
}
/**
 * AuditFeature — автоматически заполняет audit-поля.
 *
 * 1. Добавляет created_at и updated_at через amendSchema()
 * 2. Устанавливает created_at + updated_at при создании записи
 * 3. Обновляет updated_at при изменении записи
 *
 * Использование в схеме:
 *   features: [AuditFeature],
 */
class AuditFeature extends base_feature_1.KadmiumFeature {
    constructor() {
        super(...arguments);
        this.hooks = {
            beforeCreate: [(ctx) => {
                    const now = new Date();
                    if (!ctx.getData('created_at')) {
                        ctx.setData("created_at", now);
                    }
                    if (!ctx.getData("updated_at")) {
                        ctx.setData("updated_at", now);
                    }
                }],
            beforeUpdate: [(ctx) => {
                    ctx.setData("updated_at", new Date());
                }],
        };
    }
    amendSchema() {
        return {
            fields: [
                (0, init_1.datetime)({
                    name: "created_at",
                    label: "Created At",
                    required: false,
                    db: { nullable: true, index: true },
                }),
                (0, init_1.datetime)({
                    name: "updated_at",
                    label: "Updated At",
                    required: false,
                    db: { nullable: true, index: true },
                }),
            ],
        };
    }
}
exports.AuditFeature = AuditFeature;
//# sourceMappingURL=audit.feature.js.map