"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseQueryBuilder = void 0;
exports.toSqlString = toSqlString;
const builder_base_1 = require("../types/builder.base");
/**
 * Formats a KadmiumSqb instance into a human-readable SQL string with parameters.
 */
function toSqlString(sqb, adapter) {
    const { text, values } = adapter.toSql(sqb);
    return `SQL: ${text}\nVALUES: [${values.join(", ")}]`;
}
class BaseQueryBuilder extends builder_base_1.BaseWhereBuilder {
    // The constructor is identical to BaseWhereBuilder, so we just call super.
    constructor(_sqb, _proxy, _group) {
        super(_sqb, _proxy, _group);
        this._sqb = _sqb;
        this._proxy = _proxy;
        this._group = _group;
    }
    limit(count) {
        this._sqb._limit = count;
        return this;
    }
    offset(count) {
        this._sqb._skip = count;
        return this;
    }
    page(page, size) {
        const pageNumber = Math.max(1, page);
        const pageSize = Math.max(1, size);
        this.limit(pageSize);
        this.offset((pageNumber - 1) * pageSize);
        return this;
    }
    order(selector, direction = "asc") {
        const field = selector(this.selectProxy);
        this._sqb._orders.push({ by: field, direction });
        return this;
    }
    groupBy(selector) {
        const selected = selector(this.selectProxy);
        const fields = Array.isArray(selected) ? selected : [selected];
        this._sqb._groupBy.push(...fields);
        return this;
    }
}
exports.BaseQueryBuilder = BaseQueryBuilder;
//# sourceMappingURL=base-query.builder.js.map