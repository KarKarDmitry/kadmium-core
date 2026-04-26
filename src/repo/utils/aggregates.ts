import { AggregateField } from '../types/aggregate.js';
import { SelectableField } from '../types/selectable.js';
import { AggregateFunctions } from '../types/query/index.js';

export const aggregates: AggregateFunctions = {
    count: (field) => new AggregateField('count', field),
    sum: (field) => new AggregateField('sum', field),
    avg: (field) => new AggregateField('avg', field),
    min: (field) => new AggregateField('min', field),
    max: (field) => new AggregateField('max', field),
};
