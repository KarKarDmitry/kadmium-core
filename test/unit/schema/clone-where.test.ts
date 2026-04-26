import { UnitTest } from '../../types/UnitTest';
import { cloneWhereGroup } from '../../../src/sqb/utils';
import { WhereGroup, WhereCondition } from '../../../src/sqb/kadmium-sqb';
import { IS_FILTER_BUILDER, IS_QUERY_BUILDER } from '../../../src/repo/symbols';

/**
 * Unit-тест для cloneWhereGroup().
 *
 * Проверяет:
 * 1. Глубокое клонирование (не ссылка на оригинал)
 * 2. Сохранение Symbol properties (IS_FILTER_BUILDER, IS_QUERY_BUILDER)
 * 3. Рекурсивное клонирование вложенных групп
 * 4. Копирование всех полей WhereCondition
 */
export class CloneWhereTest extends UnitTest {
    constructor() {
        super('Clone Where Group');
    }

    protected async runImpl(): Promise<void> {
        this.test_deepClone();
        this.test_preservesFilterBuilderSymbol();
        this.test_preservesQueryBuilderSymbol();
        this.test_nestedGroups();
        this.test_emptyGroup();
    }

    private test_deepClone(): void {
        const original: WhereGroup = {
            op: 'AND',
            conditions: [
                { field: 'name', op: '=', value: 'Alice' } as WhereCondition,
            ],
        };

        const cloned = cloneWhereGroup(original);

        // Изменение клона не должно влиять на оригинал
        (cloned.conditions[0] as WhereCondition).value = 'Bob';

        if ((original.conditions[0] as WhereCondition).value !== 'Alice') {
            throw new Error('deepClone: clone mutation affected original');
        }
        if ((cloned.conditions[0] as WhereCondition).value !== 'Bob') {
            throw new Error('deepClone: clone value not updated');
        }
    }

    private test_preservesFilterBuilderSymbol(): void {
        const filterBuilderMock = {
            [IS_FILTER_BUILDER]: true,
            getIdentifierForSql: () => '"other_field"',
        };

        const original: WhereGroup = {
            op: 'AND',
            conditions: [
                {
                    field: 'name',
                    op: '=',
                    value: filterBuilderMock,
                } as WhereCondition,
            ],
        };

        const cloned = cloneWhereGroup(original);
        const clonedValue = (cloned.conditions[0] as WhereCondition).value;

        if (!clonedValue[IS_FILTER_BUILDER]) {
            throw new Error('cloneWhereGroup: IS_FILTER_BUILDER symbol lost');
        }
    }

    private test_preservesQueryBuilderSymbol(): void {
        const queryBuilderMock = {
            [IS_QUERY_BUILDER]: true,
            sqb: {},
        };

        const original: WhereGroup = {
            op: 'AND',
            conditions: [
                {
                    field: 'id',
                    op: 'IN',
                    value: queryBuilderMock,
                } as WhereCondition,
            ],
        };

        const cloned = cloneWhereGroup(original);
        const clonedValue = (cloned.conditions[0] as WhereCondition).value;

        if (!clonedValue[IS_QUERY_BUILDER]) {
            throw new Error('cloneWhereGroup: IS_QUERY_BUILDER symbol lost');
        }
    }

    private test_nestedGroups(): void {
        const original: WhereGroup = {
            op: 'AND',
            conditions: [
                { field: 'a', op: '=', value: 1 } as WhereCondition,
                {
                    op: 'OR',
                    conditions: [
                        { field: 'b', op: '=', value: 2 } as WhereCondition,
                        { field: 'c', op: '=', value: 3 } as WhereCondition,
                    ],
                },
            ],
        };

        const cloned = cloneWhereGroup(original);

        // Проверка структуры
        if (cloned.op !== 'AND')
            throw new Error('nested: top-level op changed');
        if (cloned.conditions.length !== 2)
            throw new Error('nested: conditions count changed');

        const nestedGroup = cloned.conditions[1] as WhereGroup;
        if (nestedGroup.op !== 'OR')
            throw new Error('nested: nested op changed');
        if (nestedGroup.conditions.length !== 2)
            throw new Error('nested: nested conditions count changed');

        // Проверка deep clone
        (nestedGroup.conditions[0] as WhereCondition).value = 999;
        const originalNested = original.conditions[1] as WhereGroup;
        if ((originalNested.conditions[0] as WhereCondition).value === 999) {
            throw new Error(
                'nested: clone mutation affected original nested condition',
            );
        }
    }

    private test_emptyGroup(): void {
        const original: WhereGroup = {
            op: 'AND',
            conditions: [],
        };

        const cloned = cloneWhereGroup(original);

        if (cloned.op !== 'AND') throw new Error('empty: op changed');
        if (cloned.conditions.length !== 0)
            throw new Error('empty: conditions not empty');
    }
}
