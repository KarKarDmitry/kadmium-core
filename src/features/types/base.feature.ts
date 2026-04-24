import { SchemaCore } from "../../core/schema-core.js";
import { HookContext, SchemaAmendment } from "./index.js";
import { ControllerInstance } from "../../controller/types/controller.js";
import { Schema_OPT } from "../../schema/types/schema.js";
import { FeatureModel } from "../../model/types.js";
import { AnyModel } from "../../model/model.js";

/**
 * Хук-функция (before-операции).
 */
export type FeatureBeforeHook<T extends AnyModel> = (
  ctx: HookContext<T>,
) => void | Promise<void>;

/**
 * Хук-функция (after-операции).
 */
export type FeatureAfterHook<T extends AnyModel> = (
  result: any,
  ctx: HookContext<T>,
) => void | Promise<void>;

/**
 * Все хуки фичи.
 *
 * Разработчик явно указывает тип ctx в каждой функции:
 *   hooks = {
 *     afterCreate: [(result, ctx: HookContext<Revision>) => { ... }],
 *   };
 */
export interface FeatureHooks<T extends AnyModel> {
  beforeCreate?: FeatureBeforeHook<T>[];
  afterCreate?: FeatureAfterHook<T>[];
  beforeUpdate?: FeatureBeforeHook<T>[];
  afterUpdate?: FeatureAfterHook<T>[];
  beforeDelete?: FeatureBeforeHook<T>[];
  afterDelete?: FeatureAfterHook<T>[];
  beforeRead?: FeatureBeforeHook<T>[];
  afterRead?: FeatureAfterHook<T>[];
}

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
export abstract class KadmiumFeature<TModel extends FeatureModel = any> {
  constructor(protected core: SchemaCore) { }

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
  priority: number = 0;

  /**
   * Класс модели фичи.
   *
   * Опционально — если фича имеет собственную модель (например, Revision),
   * укажите её здесь. Схема автоматически извлечётся из ModelClass._conf_.schema.
   *
   * Пример:
   *   protected readonly ModelClass = Revision;
   */
  protected readonly ModelClass?: new () => TModel;

  /**
   * Динамическое добавление полей, секций, действий в схему.
   *
   * Вызывается один раз при инициализации SchemaCore, до построения registry.
   * Возвращённые поля добавляются в normalized.form.fields, секции — в normalized.form.sections.
   *
   * @returns Объект с полями/секциями/actions или void
   */
  amendSchema?(): SchemaAmendment | void;

  /**
   * Автоматически возвращает схему из ModelClass._conf_.schema.
   *
   * Не нужно переопределять — базовая реализация создаёт экземпляр
   * модели и извлекает схему из _conf_.
   *
   * @returns Schema_OPT или null
   */
  createSchemas(): Schema_OPT | null {
    if (!this.ModelClass) return null;
    const instance = new this.ModelClass();
    const schema = instance._conf_.schema;
    return schema ? schema : null;
  }

  /**
   * Хуки фичи.
   *
   * Подкласс объявляет с нужным типом, TypeScript выводит его автоматически:
   * ```ts
   * hooks = {
   *   afterCreate: [(result, ctx) => { ... }],
   * };
   * ```
   * Ядро читает через `feature.hooks?.beforeCreate`.
   */
  hooks?: FeatureHooks<TModel>;

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
  controllers: ControllerInstance<TModel>[] = [];
}
