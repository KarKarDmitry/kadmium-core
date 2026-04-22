"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregates = void 0;
const aggregate_1 = require("../types/aggregate");
exports.aggregates = {
    count: (field) => new aggregate_1.AggregateField("count", field),
    sum: (field) => new aggregate_1.AggregateField("sum", field),
    avg: (field) => new aggregate_1.AggregateField("avg", field),
    min: (field) => new aggregate_1.AggregateField("min", field),
    max: (field) => new aggregate_1.AggregateField("max", field),
};
//# sourceMappingURL=aggregates.js.map