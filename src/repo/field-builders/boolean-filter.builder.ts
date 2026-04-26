import { AnyModel } from '../../model/model.js';
import { WhereCondition } from '../../sqb/kadmium-sqb.js';
import { BaseFilterBuilder } from './base-filter.builder.js';
import { Comparable } from '../types/query/index.js';

export class BooleanFilterBuilder<
    T extends AnyModel,
    K extends keyof T,
> extends BaseFilterBuilder<T, K> {
    eq(value: Comparable<T[K]>): WhereCondition {
        return {
            field: this.field as string,
            alias: this.alias,
            op: '=',
            value: value,
        };
    }

    neq(value: Comparable<T[K]>): WhereCondition {
        return {
            field: this.field as string,
            alias: this.alias,
            op: '!=',
            value: value,
        };
    }

    true(): WhereCondition {
        return {
            field: this.field as string,
            alias: this.alias,
            op: '=',
            value: true,
        };
    }

    false(): WhereCondition {
        return {
            field: this.field as string,
            alias: this.alias,
            op: '=',
            value: false,
        };
    }
}
