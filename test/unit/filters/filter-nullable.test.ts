import { UnitTest } from '../../types/UnitTest';
import { StringFilterBuilder } from '../../../src/repo/field-builders/string-filter.builder';
import { NullableMixin } from '../../../src/repo/field-builders/nullable.mixin';
import { KadmiumSqb } from '../../../src/sqb/kadmium-sqb';
import { AnyModel } from '../../../src/model/model';

interface TestModel extends AnyModel {
    _meta: 'generated-schema';
    id: string | number;
    name: string | null;
}

export class NullableFilterTest extends UnitTest {
    constructor() {
        super('NullableMixin .null and .notNull');
    }

    protected async runImpl(): Promise<void> {
        this.test_null();
        this.test_notNull();
        this.test_nullReturnsWhereCondition();
    }

    private createBuilder() {
        const mockSqb = {
            _wheres: { op: 'AND' as const, conditions: [] },
        } as unknown as KadmiumSqb<TestModel>;
        // NullableMixin — фабрика классов: принимает класс, возвращает новый класс
        const NullableBuilder = NullableMixin(StringFilterBuilder);
        return new NullableBuilder(mockSqb, 'name', 'u');
    }

    private test_null(): void {
        const cond = this.createBuilder().null;
        if (!cond) throw new Error('.null should return a condition');
        if ((cond as any).op !== 'IS') throw new Error('.null should use IS');
        if ((cond as any).value !== null)
            throw new Error('.null value should be null');
    }

    private test_notNull(): void {
        const cond = this.createBuilder().notNull;
        if (!cond) throw new Error('.notNull should return a condition');
        if ((cond as any).op !== 'IS NOT')
            throw new Error('.notNull should use IS NOT');
        if ((cond as any).value !== null)
            throw new Error('.notNull value should be null');
    }

    private test_nullReturnsWhereCondition(): void {
        const cond = this.createBuilder().null;
        if (typeof cond !== 'object')
            throw new Error('.null should return WhereCondition object');
        if (!(cond as any).field)
            throw new Error('Condition should have field');
    }
}
