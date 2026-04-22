"use strict";
/**
 * ResultReshaper — трансформирует flat-результаты PostgreSQL
 * в nested структуру для multi-table запросов.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultReshaper = void 0;
class ResultReshaper {
    static reshape(flatRows, selects, includes) {
        return flatRows.map((flatRow) => {
            const nestedRow = {};
            for (const sel of selects) {
                if (sel.fieldType === "selectable-field") {
                    const selectable = sel;
                    const tableAlias = selectable.source.tableAlias;
                    const sqlResultName = selectable.alias ||
                        (tableAlias
                            ? `${tableAlias}.${String(selectable.source.fieldName)}`
                            : String(selectable.source.fieldName));
                    const propertyName = selectable.alias || String(selectable.source.fieldName);
                    if (tableAlias) {
                        if (!nestedRow[tableAlias])
                            nestedRow[tableAlias] = {};
                        if (flatRow[sqlResultName] !== undefined) {
                            nestedRow[tableAlias][propertyName] = flatRow[sqlResultName];
                        }
                    }
                    else {
                        nestedRow[propertyName] = flatRow[sqlResultName];
                    }
                }
                else if (sel.fieldType === "aggregate-field") {
                    const aggregate = sel;
                    if (aggregate.alias && flatRow[aggregate.alias] !== undefined) {
                        let value = flatRow[aggregate.alias];
                        if (aggregate.func === "count" ||
                            aggregate.func === "sum" ||
                            aggregate.func === "avg") {
                            if (value !== null && value !== undefined)
                                value = Number(value);
                        }
                        nestedRow[aggregate.alias] = value;
                    }
                }
            }
            for (const incl of includes) {
                const parentAlias = incl.parentAlias;
                const propertyName = incl.propertyName;
                if (flatRow[propertyName] !== undefined) {
                    if (!nestedRow[parentAlias])
                        nestedRow[parentAlias] = {};
                    nestedRow[parentAlias][propertyName] = flatRow[propertyName];
                }
            }
            return nestedRow;
        });
    }
}
exports.ResultReshaper = ResultReshaper;
//# sourceMappingURL=result-reshaper.js.map