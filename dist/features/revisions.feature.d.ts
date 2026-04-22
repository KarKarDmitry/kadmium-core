import { KadmiumFeature, FeatureHooks } from "./types/base.feature";
import { ControllerInstance } from "../controller/types/controller";
import { FeatureModel } from "../model/types";
/**
 * Revision — модель ревизий, определяемая вручную разработчиком.
 *
 * Наследуется от FeatureModel, содержит поля и схему через _conf_.schema.
 * Генератор распознаёт такие классы и генерирует полноценную модель
 * в src/models/features/Revision.ts.
 */
export declare class Revision extends FeatureModel {
    id: number;
    target_table: string;
    target_id: string;
    data: Record<string, unknown>;
    changed_fields: string;
    changed_at: Date;
    changed_by: string;
    _conf_: {
        schema: import("../schema/types/schema").Schema_OPT;
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
export declare class RevisionsFeature extends KadmiumFeature<Revision> {
    protected core: import("../core/schema-core").SchemaCore;
    priority: number;
    /**
     * Модель ревизий — используется базовой реализацией createSchemas().
     */
    protected readonly ModelClass: typeof Revision;
    /**
     * Set схем, для которых фича подключена.
     */
    static readonly registeredSchemas: Set<string>;
    constructor(core: import("../core/schema-core").SchemaCore);
    /**
     * Регистрирует схему revision через FeatureModel.
     */
    createSchemas(): import("../schema/types/schema").Schema_OPT | null;
    /**
     * Проверяет, что ревизии подключены для схемы.
     */
    static ensureEnabled(collection: string): void;
    /**
     * Хуки — записываем ревизию после create/update.
     */
    hooks: FeatureHooks<Revision>;
    /**
     * Контроллер для доступа к ревизиям.
     */
    controllers: ControllerInstance<Revision>[];
    private _saveRevision;
}
//# sourceMappingURL=revisions.feature.d.ts.map