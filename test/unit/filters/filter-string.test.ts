import { UnitTest } from '../../types/UnitTest';
import { StringFilterBuilder } from '../../../src/repo/field-builders/string-filter.builder';
import { IS_FILTER_BUILDER } from '../../../src/repo/symbols';
import { KadmiumSqb } from '../../../src/sqb/kadmium-sqb';
import { AnyModel } from '../../../src/model/model';

interface TestModel extends AnyModel {
    _meta: 'generated-schema';
    id: string;
    name: string;
    email: string;
}

export class StringFilterTest extends UnitTest {
    constructor() {
        super('StringFilterBuilder methods');
    }

    protected async runImpl(): Promise<void> {
        this.test_hasSymbol();
        this.test_eq();
        this.test_neq();
        this.test_like();
        this.test_start();
        this.test_end();
        this.test_ilike();
        this.test_in();
    }

    private createBuilder(): StringFilterBuilder<TestModel, 'name'> {
        const mockSqb = {
            _wheres: { op: 'AND' as const, conditions: [] },
        } as unknown as KadmiumSqb<TestModel>;
        return new StringFilterBuilder(mockSqb, 'name', 'u');
    }

    private test_hasSymbol(): void {
        const builder = this.createBuilder();
        if (!builder[IS_FILTER_BUILDER])
            throw new Error('Should have IS_FILTER_BUILDER symbol');
    }

    private test_eq(): void {
        const cond = this.createBuilder().eq('Alice');
        if (cond.op !== '=') throw new Error('eq should use =');
        if (cond.value !== 'Alice') throw new Error('eq value mismatch');
    }

    private test_neq(): void {
        const cond = this.createBuilder().neq('Bob');
        if (cond.op !== '!=') throw new Error('neq should use !=');
    }

    private test_like(): void {
        const cond = this.createBuilder().like('test');
        if (cond.op !== 'LIKE') throw new Error('like should use LIKE');
        if (cond.value !== '%test%')
            throw new Error('like should add wildcards');
    }

    private test_start(): void {
        const cond = this.createBuilder().start('admin');
        if (cond.op !== 'LIKE') throw new Error('start should use LIKE');
        if (cond.value !== 'admin%') throw new Error('start value mismatch');
    }

    private test_end(): void {
        const cond = this.createBuilder().end('.com');
        if (cond.op !== 'LIKE') throw new Error('end should use LIKE');
        if (cond.value !== '%.com') throw new Error('end value mismatch');
    }

    private test_ilike(): void {
        const cond = this.createBuilder().ilike('Test');
        if (cond.op !== 'ILIKE') throw new Error('ilike should use ILIKE');
        if (cond.value !== '%Test%') throw new Error('ilike value mismatch');
    }

    private test_in(): void {
        const cond = this.createBuilder().in(['A', 'B', 'C']);
        if (cond.op !== 'IN') throw new Error('in should use IN');
        const vals = cond.value as string[];
        if (vals.length !== 3) throw new Error('in should have 3 values');
    }
}
