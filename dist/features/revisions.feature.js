"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevisionsFeature = exports.Revision = void 0;
const base_feature_1 = require("./types/base.feature");
const init_1 = require("../schema/init");
const init_2 = require("../controller/init");
const types_1 = require("../model/types");
/**
 * Revision — модель ревизий, определяемая вручную разработчиком.
 *
 * Наследуется от FeatureModel, содержит поля и схему через _conf_.schema.
 * Генератор распознаёт такие классы и генерирует полноценную модель
 * в src/models/features/Revision.ts.
 */
class Revision extends types_1.FeatureModel {
    constructor() {
        super(...arguments);
        this._conf_ = {
            schema: (0, init_1.schema)({
                collection: "revision",
                folder: "features",
                version: "1.0",
                primary: (0, init_1.primary)({
                    name: "id",
                    label: "ID",
                    db_type: "number",
                    auto_increment: true,
                }),
                form: (0, init_1.form)({
                    sections: [
                        init_1.sections.block({
                            key: "main",
                            title: "Revision",
                            fields: [
                                (0, init_1.string)({
                                    name: "target_table",
                                    label: "Target Table",
                                    required: true,
                                    db: { index: true },
                                }),
                                (0, init_1.string)({
                                    name: "target_id",
                                    label: "Target ID",
                                    required: true,
                                    db: { index: true },
                                }),
                                (0, init_1.jsonb)({
                                    name: "data",
                                    label: "Data Snapshot",
                                    required: false,
                                }),
                                (0, init_1.string)({
                                    name: "changed_fields",
                                    label: "Changed Fields",
                                    required: false,
                                }),
                                (0, init_1.datetime)({
                                    name: "changed_at",
                                    label: "Changed At",
                                    required: false,
                                    db: { index: true },
                                }),
                                (0, init_1.ref)({
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
}
exports.Revision = Revision;
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
class RevisionsFeature extends base_feature_1.KadmiumFeature {
    constructor(core) {
        super(core);
        this.core = core;
        // Выполняется последним — должен видеть финальные данные
        this.priority = 100;
        /**
         * Модель ревизий — используется базовой реализацией createSchemas().
         */
        this.ModelClass = Revision;
        /**
         * Хуки — записываем ревизию после create/update.
         */
        this.hooks = {
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
        this.controllers = [
            (0, init_2.controller)(Revision, [
                (0, init_2.get)("/revisions/:table/:id", async (ctx) => {
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
    static ensureEnabled(collection) {
        if (!this.registeredSchemas.has(collection)) {
            throw Object.assign(new Error(`Ревизии не подключены для схемы "${collection}"`), { statusCode: 400 });
        }
    }
    async _saveRevision(result, ctx) {
        const changedFields = Object.keys(result ?? {});
        await ctx.repo
            .get(Revision)
            .create({
            target_table: this.core.collection,
            target_id: String(result[this.core.normalized.primary.name] ?? ""),
            data: result,
            changed_fields: JSON.stringify(changedFields),
            changed_at: new Date(),
            changed_by: ctx.user?.id,
        })
            .go()
            .catch(() => {
            // Не ломаем основную операцию если ревизия не записалась
        });
    }
}
exports.RevisionsFeature = RevisionsFeature;
/**
 * Set схем, для которых фича подключена.
 */
RevisionsFeature.registeredSchemas = new Set();
//# sourceMappingURL=revisions.feature.js.map