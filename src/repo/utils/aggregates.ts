import { AggregateField } from "../types/aggregate";
import { SelectableField } from "../types/selectable";
import { AggregateFunctions } from "../types/query";

export const aggregates: AggregateFunctions = {
  count: (field) => new AggregateField("count", field),
  sum: (field) => new AggregateField("sum", field),
  avg: (field) => new AggregateField("avg", field),
  min: (field) => new AggregateField("min", field),
  max: (field) => new AggregateField("max", field),
};
