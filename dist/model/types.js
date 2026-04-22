"use strict";
// src/model/types.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureModel = exports.ModelHookContext = void 0;
const model_1 = require("./model");
// ─────────────────────────────────────────────
// Model Hook Types
// ─────────────────────────────────────────────
/**
 * Контекст, передаваемый в хуки модели.
 */
class ModelHookContext {
    constructor(operation, repo, schema, data) {
        this.operation = operation;
        /** Накопленные where-условия (для beforeRead) */
        this._wheres = [];
        /** Флаг прерывания */
        this._aborted = false;
        this.repo = repo;
        this.schema = schema;
        this.data = data ? { ...data } : {};
    }
    // ── Where API ──
    /** Добавить условие where (для beforeRead) */
    whereAdd(condition) {
        this._wheres.push(condition);
    }
    /** Получить накопленные where-условия */
    getWheres() {
        return this._wheres;
    }
    // ── Abort API ──
    get aborted() {
        return this._aborted;
    }
    /** Прервать операцию */
    abort(reason) {
        this._aborted = true;
        this._abortReason = reason;
        throw new Error(`Model hook aborted: ${reason ?? "no reason"}`);
    }
}
exports.ModelHookContext = ModelHookContext;
/**
 * Базовый класс для моделей, создаваемых фичами.
 *
 * Разработчик наследуется от FeatureModel, определяет поля и указывает
 * схему через _conf_.schema. Генератор распознаёт такие классы и
 * генерирует полноценную модель в src/models/features/.
 */
class FeatureModel extends model_1.AnyModel {
    constructor() {
        super(...arguments);
        /** Конфигурация: схема фичи */
        this._conf_ = {
            schema: {},
        };
    }
}
exports.FeatureModel = FeatureModel;
//# sourceMappingURL=types.js.map