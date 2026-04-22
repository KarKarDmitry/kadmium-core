"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHookFieldSelector = createHookFieldSelector;
/**
 * Определяет тип поля из метаданных схемы.
 */
function getFieldKind(fieldDef) {
    if (!fieldDef)
        return "string";
    switch (fieldDef.type) {
        case "primary":
            return fieldDef.db_type === "number" ? "number" : "string";
        case "number":
            return "number";
        case "date":
        case "datetime":
        case "time":
            return "date";
        case "boolean":
            return "boolean";
        case "ref":
            return "string"; // ref определяется по типу PK связанной схемы
        default:
            return "string";
    }
}
/**
 * Создаёт Proxy для типобезопасного выбора полей и вызова фильтров.
 */
function createHookFieldSelector(alias, wheres) {
    return new Proxy({}, {
        get(_target, prop) {
            if (typeof prop === "symbol")
                return;
            const fieldName = prop;
            return new Proxy({}, {
                get(_target2, method) {
                    if (typeof method === "symbol")
                        return;
                    // null / notNull getters
                    if (method === "null") {
                        wheres.push({ alias, field: fieldName, op: "IS", value: null });
                        return undefined;
                    }
                    if (method === "notNull") {
                        wheres.push({ alias, field: fieldName, op: "IS NOT", value: null });
                        return undefined;
                    }
                    // Methods that take values
                    return (v1, v2) => {
                        let op;
                        let value;
                        switch (method) {
                            case "eq":
                                op = "=";
                                value = v1;
                                break;
                            case "ne":
                                op = "!=";
                                value = v1;
                                break;
                            case "gt":
                                op = ">";
                                value = v1;
                                break;
                            case "gte":
                                op = ">=";
                                value = v1;
                                break;
                            case "lt":
                                op = "<";
                                value = v1;
                                break;
                            case "lte":
                                op = "<=";
                                value = v1;
                                break;
                            case "in":
                                op = "IN";
                                value = v1;
                                break;
                            case "like":
                                op = "LIKE";
                                value = v1;
                                break;
                            case "ilike":
                                op = "ILIKE";
                                value = v1;
                                break;
                            case "between":
                                op = "BETWEEN";
                                value = [v1, v2];
                                break;
                            case "contains":
                                op = "LIKE";
                                value = `%${v1}%`;
                                break;
                            case "startsWith":
                                op = "LIKE";
                                value = `${v1}%`;
                                break;
                            case "endsWith":
                                op = "LIKE";
                                value = `%${v1}`;
                                break;
                            default:
                                op = method;
                                value = v1;
                        }
                        wheres.push({ alias, field: fieldName, op, value });
                    };
                },
            });
        },
    });
}
//# sourceMappingURL=hook-filter-proxy.js.map