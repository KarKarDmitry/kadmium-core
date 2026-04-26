import { Kadmium } from '../../kadmium-app.js';

export async function run() {
    await Kadmium.setConfig();
    Kadmium.getDbMutator(true);
    await Kadmium.preheat();

    console.log('[db:diff] Schemas loaded and registered.\n');

    const dbMutator = Kadmium.getDbMutator();
    if (!dbMutator) {
        throw new Error('DbMutator not initialized');
    }

    const diffResult = await dbMutator.getDiff();

    console.log('═══════════════════════════════════════════');
    console.log('  Schema Diff');
    console.log('═══════════════════════════════════════════');
    console.log(`  Added tables:      ${diffResult.summary.addedTables}`);
    console.log(`  Dropped tables:    ${diffResult.summary.droppedTables}`);
    console.log(`  Added columns:     ${diffResult.summary.addedColumns}`);
    console.log(`  Dropped columns:   ${diffResult.summary.droppedColumns}`);
    console.log(`  Altered columns:   ${diffResult.summary.alteredColumns}`);
    console.log(`  Added indexes:     ${diffResult.summary.addedIndexes}`);
    console.log(`  Dropped indexes:   ${diffResult.summary.droppedIndexes}`);
    console.log(`  Added FKs:         ${diffResult.summary.addedForeignKeys}`);
    console.log(
        `  Dropped FKs:       ${diffResult.summary.droppedForeignKeys}`,
    );
    console.log('═══════════════════════════════════════════');

    if (!diffResult.hasChanges) {
        console.log('\n✅ No changes detected. DB matches schemas.\n');
        return;
    }

    console.log('\n📝 SQL Preview:\n');
    const sqlStatements = await dbMutator.getMigrationPreview();

    for (let i = 0; i < sqlStatements.length; i++) {
        const op = diffResult.operations[i];
        const sql = sqlStatements[i];

        let label = '';
        switch (op.type) {
            case 'create-table':
                label = `CREATE TABLE ${op.table}`;
                break;
            case 'add-column':
                label = `ADD COLUMN ${op.table}.${op.column.name}`;
                break;
            case 'drop-column':
                label = `DROP COLUMN ${op.table}.${op.columnName}`;
                break;
            case 'alter-type':
                label = `ALTER TYPE ${op.table}.${op.columnName}`;
                break;
            case 'alter-nullable':
                label = `ALTER NULLABLE ${op.table}.${op.columnName}`;
                break;
            case 'add-index':
                label = `ADD INDEX ${op.index.name}`;
                break;
            case 'drop-index':
                label = `DROP INDEX ${op.indexName}`;
                break;
            case 'add-foreign-key':
                label = `ADD FK ${op.fk.name}`;
                break;
            case 'drop-foreign-key':
                label = `DROP FK ${op.fkName}`;
                break;
            default:
                label = (op as any).type;
        }

        console.log(`  ── ${label} ──`);
        console.log(`  ${sql}`);
        console.log();
    }

    console.log(`Run "kadmium db:migrate" to apply changes.\n`);
}
