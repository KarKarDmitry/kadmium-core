"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KadmiumFeature = void 0;
/**
 * Базовый абстрактный класс для всех фич Kadmium.
 *
 * Фичи — это плагины, привязанные к схеме. Они позволяют добавлять
 * функциональность (аудит, soft-delete, ревизии) без изменения ядра.
 *
 * Каждая фича получает SchemaCore в конструктор и может:
 * - Динамически добавлять поля/секции/actions через amendSchema()
 * - Перехватывать CRUD-операции через this.hooks
 * - Регистрировать собственные контроллеры через this.controllers
 *
 * Схемы для моделей фич (например, revision) определяются отдельно
 * через FeatureModel._conf_.schema и регистрируются автоматически.
 *
 * @typeparam TModel — класс модели фичи (extends FeatureModel).
 *   Если не указан, используется any.
 */
class KadmiumFeature {
    constructor(core) {
        this.core = core;
        /**
         * Приоритет выполнения хуков. Меньше = раньше.
         *
         * Рекомендуется:
         *  -100 — SoftDelete (может менять операцию delete → update)
         *     0 — Audit, Policy (обычные хуки)
         *   100 — Revisions (должен видеть финальные данные после всех мутаций)
         *
         * @default 0
         */
        this.priority = 0;
        /**
         * Контроллеры фичи.
         *
         * Пример:
         * ```ts
         * controllers = [
         *   controller(Revision, [
         *     get("/revisions/:table/:id", async (ctx) => { ... }),
         *   ]),
         * ];
         * ```
         */
        this.controllers = [];
    }
    /**
     * Автоматически возвращает схему из ModelClass._conf_.schema.
     *
     * Не нужно переопределять — базовая реализация создаёт экземпляр
     * модели и извлекает схему из _conf_.
     *
     * @returns Schema_OPT или null
     */
    createSchemas() {
        if (!this.ModelClass)
            return null;
        const instance = new this.ModelClass();
        const schema = instance._conf_.schema;
        return schema ? schema : null;
    }
}
exports.KadmiumFeature = KadmiumFeature;
//# sourceMappingURL=base.feature.js.map