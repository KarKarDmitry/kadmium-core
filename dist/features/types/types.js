"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HookContext = void 0;
const errors_1 = require("../../core/errors");
const hook_filter_proxy_1 = require("../../repo/utils/hook-filter-proxy");
/**
 * Контекст, передаваемый хукам фич.
 *
 * Каждый хук получает свой HookContext, через который может:
 * - Менять операцию (например, delete → update)
 * - Модифицировать данные (set, delete)
 * - Добавлять условия where (для beforeRead)
 * - Прерывать операцию через abort()
 */
class HookContext {
    constructor(operation, 
    /** Текущий репозиторий (только get для получения других репозиториев) */
    repo, 
    /** Схема, к которой привязан хук */
    schema, 
    /** Начальные данные */
    initialData, 
    /** Информация о текущем пользователе */
    user) {
        this.repo = repo;
        this.schema = schema;
        this.user = user;
        /** Условия where, добавленные хуками */
        this._wheres = [];
        /** Флаг прерывания */
        this._aborted = false;
        this.operation = operation;
        this._data = initialData ? { ...initialData } : {};
    }
    /** Установить alias (для internal use) */
    _setAlias(alias) {
        this._alias = alias;
    }
    /** Получить alias таблицы (для beforeRead хуков) */
    get tableAlias() {
        return this._alias;
    }
    // ── Data API ──
    /** Получить поле из данных */
    getData(key) {
        return this._data[key];
    }
    /** Установить поле в данных */
    setData(key, value) {
        this._data[key] = value;
    }
    /** Удалить поле из данных */
    deleteData(key) {
        delete this._data[key];
    }
    /** Получить все данные как PlainObject (для передачи в адаптер БД) */
    toData() {
        return { ...this._data };
    }
    // ── Where API ──
    /**
     * Типобезопасное добавление WHERE-условий.
     * Alias подставляется автоматически из ctx.tableAlias.
     *
     * beforeRead: [(ctx: HookContext<User>) => {
     *     ctx.where((f) => f.deleted_at.null);
     *     ctx.where((f) => f.status.eq('active'));
     * }],
     */
    where(fn) {
        const selector = (0, hook_filter_proxy_1.createHookFieldSelector)(this._alias, this._wheres);
        fn(selector);
    }
    /** Добавить сырое условие where (для beforeRead) — legacy API */
    whereAdd(condition) {
        this._wheres.push(condition);
    }
    /** Очистить все добавленные хуками where-условия */
    whereClear() {
        this._wheres = [];
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
        throw errors_1.Errors.feature.abort(this.operation, reason);
    }
}
exports.HookContext = HookContext;
//# sourceMappingURL=types.js.map