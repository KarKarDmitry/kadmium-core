const commands: Record<
    string,
    () => Promise<{ run: (args: string[]) => Promise<void> }>
> = {
    // DB
    'db:migrate': () => import('./db/migrate.js'),
    'db:diff': () => import('./db/diff.js'),
    'db:health': () => import('./db/health.js'),

    // Gen
    'gen:schema': () => import('./gen/schema.js'),

    // Cluster
    'cluster:init': () => import('./cluster/init.js'),
    'cluster:add': () => import('./cluster/add.js'),
    'cluster:config': () => import('./cluster/config.js'),
    'cluster:deploy': () => import('./cluster/deploy.js'),
    'cluster:dev': () => import('./cluster/dev.js'),
    'cluster:health': () => import('./cluster/health.js'),

    // Service
    'service:create': () => import('./service/create.js'),
    'service:health': () => import('./service/health.js'),
    'service:logs': () => import('./service/logs.js'),

    // Auth
    'auth:bootstrap': () => import('./auth/bootstrap.js'),
    'auth:register': () => import('./auth/register.js'),
    'auth:unregister': () => import('./auth/unregister.js'),
    'auth:key:generate': () => import('./auth/key-generate.js'),
    'auth:key:rotate': () => import('./auth/key-rotate.js'),
    'auth:key:jwks': () => import('./auth/key-jwks.js'),

    // SDK
    'sdk:init': () => import('./sdk/init.js'),
    'sdk:update': () => import('./sdk/update.js'),

    // Help
    help: () => import('./help.js'),
};

/**
 * Main CLI entry point.
 * Called by cli.cjs (CJS wrapper) or directly via node --input-type=module.
 *
 * @param args - Command line arguments (without node and script path).
 *               First element should be the command (e.g. "cluster:init").
 */
export async function run(args: string[]): Promise<void> {
    const [command, ...cmdArgs] = args;

    const loader = commands[command as keyof typeof commands];

    if (!loader) {
        console.error(`Unknown command: ${command}`);
        console.error('Run "kadmium help" for available commands.');
        process.exit(1);
    }

    try {
        const mod = await loader();
        await mod.run(cmdArgs);
        process.exit(0);
    } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
    }
}
