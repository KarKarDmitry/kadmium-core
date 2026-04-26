#!/usr/bin/env node

const [, , command, ...args] = process.argv;

async function main() {
    const commands = {
        'db:migrate': () => import('./commands/db-migrate.js'),
        'db:diff': () => import('./commands/db-diff.js'),
        'db:health': () => import('./commands/db-health.js'),
        'gen:schema': () => import('./generate-types.js'),
    };

    const loader = commands[command as keyof typeof commands];

    if (!loader) {
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }

    try {
        const mod = await loader();
        await mod.run(args);
        process.exit(0);
    } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
    }
}

main();
