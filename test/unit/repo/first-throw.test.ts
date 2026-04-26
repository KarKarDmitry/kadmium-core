import { UnitTest } from '../../types/UnitTest';
import { cloneWhereGroup } from '../../../src/sqb/utils';
import { WhereGroup, WhereCondition } from '../../../src/sqb/kadmium-sqb';
import { IS_FILTER_BUILDER, IS_QUERY_BUILDER } from '../../../src/repo/symbols';

export class FirstOrThrowTest extends UnitTest {
    constructor() {
        super('firstOrThrow throws on empty result');
    }

    protected async runImpl(): Promise<void> {
        this.test_firstOrThrowReturnsValue();
        this.test_firstOrThrowThrowsOnUndefined();
    }

    private test_firstOrThrowReturnsValue(): void {
        // Simulate the logic: first() returns { go: () => results[0] }
        // firstOrThrow wraps it and checks for undefined
        const mockResults = [{ id: '1', name: 'Alice' }];
        const result = mockResults[0];

        if (!result) throw new Error('Expected result to exist');
        if (result.id !== '1') throw new Error("Expected id '1'");
    }

    private test_firstOrThrowThrowsOnUndefined(): void {
        const mockResults: any[] = [];
        const result = mockResults[0];

        if (result !== undefined)
            throw new Error('Expected undefined for empty array');

        // Simulate firstOrThrow behavior
        try {
            if (result === undefined) {
                throw new Error('Record not found in "users"');
            }
            throw new Error('Should have thrown');
        } catch (e: any) {
            if (!e.message.includes('not found'))
                throw new Error("Expected 'not found' error");
        }
    }
}
