/**
 * Unit Test Runner — запускает unit-тесты без БД.
 *
 * Не требует подключения к PostgreSQL.
 *
 * Использование:
 *   npm run test:unit
 */

import * as dotenv from 'dotenv';
import { UnitTest } from '../types/UnitTest';

dotenv.config();

// ── Schema ──
import { CloneWhereTest } from '../unit/schema/clone-where.test';
import { SchemaValidationTest } from '../unit/schema/schema-validation.test';

// ── Core ──
import { FeaturePriorityTest } from '../unit/core/feature-priority.test';
import { AppCoreSealTest } from '../unit/core/appcore-seal.test';

// ── Repo ──
import { HookWhereTest } from '../unit/repo/hook-where.test';
import { FirstOrThrowTest } from '../unit/repo/first-throw.test';
import { IncludeAliasTest } from '../unit/repo/include-alias.test';
import { CreateManyKeysTest } from '../unit/repo/createMany-keys.test';
import { PageGuardTest } from '../unit/repo/page-guard.test';

// ── Filters ──
import { HookFilterProxyTest } from '../unit/filters/hook-filter-proxy.test';
import { StringFilterTest } from '../unit/filters/filter-string.test';
import { NumberFilterTest } from '../unit/filters/filter-number.test';
import { NullableFilterTest } from '../unit/filters/filter-nullable.test';

async function runUnitTests() {
    console.log('═══════════════════════════════════════════════');
    console.log('           KADMIUM UNIT TEST SUITE');
    console.log('═══════════════════════════════════════════════');

    // ── Define test cases ──
    const tests: (new () => UnitTest)[] = [
        // Schema
        CloneWhereTest,
        SchemaValidationTest,
        // Core
        FeaturePriorityTest,
        AppCoreSealTest,
        // Repo
        HookWhereTest,
        FirstOrThrowTest,
        IncludeAliasTest,
        CreateManyKeysTest,
        PageGuardTest,
        // Filters
        HookFilterProxyTest,
        StringFilterTest,
        NumberFilterTest,
        NullableFilterTest,
    ];

    // ── Run tests ──
    let passed = 0;
    let failed = 0;
    const totalStart = performance.now();

    for (const TestClass of tests) {
        const test = new TestClass();

        try {
            console.log(`\n--- RUNNING: ${test.name} ---`);
            await test.run();
            test.logResult(true);
            passed++;
        } catch (e) {
            failed++;
            test.logResult(false);
            console.error(e);
        }
    }

    const totalMs = Math.round(performance.now() - totalStart);

    // ── Summary ──
    console.log('\n═══════════════════════════════════════════════');
    console.log(
        `  TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed} | TIME: ${totalMs}ms`,
    );
    console.log('═══════════════════════════════════════════════');

    if (failed > 0) {
        console.error('\n--- UNIT TESTS FAILED ---');
        process.exit(1);
    } else {
        console.log('\n--- ALL UNIT TESTS PASSED! ---');
    }
}

runUnitTests().catch((err) => {
    console.error('FATAL UNIT RUNNER ERROR:', err);
    process.exit(1);
});
