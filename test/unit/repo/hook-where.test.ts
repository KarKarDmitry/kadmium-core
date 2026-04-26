import { UnitTest } from '../../types/UnitTest';
import {
    createHookFieldSelector,
    FieldSelector,
} from '../../../src/repo/utils/hook-filter-proxy';
import { WhereCondition } from '../../../src/sqb/kadmium-sqb';

interface TestModel {
    _meta: 'generated-schema';
    id: string;
    name: string;
    age: number;
    status: string;
    created_at: Date;
    is_active: boolean;
}

export class HookWhereTest extends UnitTest {
    constructor() {
        super('HookContext where() API');
    }

    protected async runImpl(): Promise<void> {
        this.test_basicEq();
        this.test_withAlias();
        this.test_multipleConditions();
        this.test_stringMethods();
        this.test_numberMethods();
        this.test_nullMethods();
    }

    private createProxy(
        wheres: WhereCondition[],
        alias?: string,
    ): FieldSelector<TestModel> {
        return createHookFieldSelector<TestModel>(alias, wheres);
    }

    private test_basicEq(): void {
        const wheres: WhereCondition[] = [];
        const f = this.createProxy(wheres);
        f.name.eq('Alice');
        if (wheres.length !== 1) throw new Error('Expected 1 condition');
        if (wheres[0].field !== 'name')
            throw new Error("Expected field 'name'");
        if (wheres[0].op !== '=') throw new Error("Expected op '='");
        if (wheres[0].value !== 'Alice')
            throw new Error("Expected value 'Alice'");
    }

    private test_withAlias(): void {
        const wheres: WhereCondition[] = [];
        const f = this.createProxy(wheres, 'u');
        f.name.eq('Bob');
        if (wheres[0].alias !== 'u') throw new Error("Expected alias 'u'");
    }

    private test_multipleConditions(): void {
        const wheres: WhereCondition[] = [];
        const f = this.createProxy(wheres);
        f.name.eq('Alice');
        f.age.gt(25);
        if (wheres.length !== 2) throw new Error('Expected 2 conditions');
    }

    private test_stringMethods(): void {
        const wheres: WhereCondition[] = [];
        const f = this.createProxy(wheres);

        f.status.contains('active');
        if (
            (wheres[0].op as string) !== 'LIKE' ||
            wheres[0].value !== '%active%'
        )
            throw new Error('contains failed');

        wheres.length = 0;
        f.status.startsWith('admin');
        if (wheres[0].value !== 'admin%') throw new Error('startsWith failed');

        wheres.length = 0;
        f.status.endsWith('.com');
        if (wheres[0].value !== '%.com') throw new Error('endsWith failed');
    }

    private test_numberMethods(): void {
        const wheres: WhereCondition[] = [];
        const f = this.createProxy(wheres);

        f.age.gt(18);
        if ((wheres[0].op as string) !== '>') throw new Error('gt failed');

        wheres.length = 0;
        f.age.gte(18);
        if ((wheres[0].op as string) !== '>=') throw new Error('gte failed');

        wheres.length = 0;
        f.age.lt(100);
        if ((wheres[0].op as string) !== '<') throw new Error('lt failed');

        wheres.length = 0;
        f.age.between(10, 20);
        if ((wheres[0].op as string) !== 'BETWEEN')
            throw new Error('between failed');
        // Hook proxy stores value as array [min, max], real builder stores "10 AND 20" string
        const vals = wheres[0].value as number[];
        if (vals[0] !== 10 || vals[1] !== 20)
            throw new Error(
                `between values mismatch, got: ${JSON.stringify(vals)}`,
            );
    }

    private test_nullMethods(): void {
        const wheres: WhereCondition[] = [];
        const f = this.createProxy(wheres);

        f.status.null;
        if (wheres.length !== 1)
            throw new Error('Expected 1 condition for .null');
        if ((wheres[0].op as string) !== 'IS')
            throw new Error('.null should use IS');

        wheres.length = 0;
        f.status.notNull;
        if ((wheres[0].op as string) !== 'IS NOT')
            throw new Error('.notNull should use IS NOT');
    }
}
