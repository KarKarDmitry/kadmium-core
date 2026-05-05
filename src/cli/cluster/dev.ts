import { join } from 'path';
import { readFileSync } from 'fs';
import spawn from 'cross-spawn';
import type { ChildProcess } from 'child_process';
import { detectContext, requireClusterRoot } from '../utils/context.js';
import { logger } from '../utils/logger.js';
import { readMeta } from '../utils/cluster-meta.js';

interface ProcDef {
    name: string;
    cwd: string;
    command: string;
    args: string[];
}

function readClusterKey(clusterPath: string): string {
    try {
        const envPath = join(clusterPath, '.env');
        const content = readFileSync(envPath, 'utf-8');
        const match = content.match(/^CLUSTER_KEY=(.+)$/m);
        return match ? match[1] : 'default-cluster-key';
    } catch {
        return 'default-cluster-key';
    }
}

export async function run(args: string[]): Promise<void> {
    const ctx = detectContext(process.cwd());
    requireClusterRoot(ctx, 'cluster:dev');

    const clusterPath = ctx.path;

    // Read kadmium.json
    const meta = readMeta(clusterPath);
    if (!meta) {
        logger.error('kadmium.json не найден. Сначала выполните cluster:init');
        process.exit(1);
    }

    const devMode = args.includes('--docker') ? 'docker' : 'concurrently';
    const authPort = meta.auth.port;

    logger.blank();
    logger.separator('Dev Mode');
    logger.info(`Режим: ${devMode}`);
    logger.info(`Домен: ${meta.domain}`);
    logger.blank();

    if (devMode === 'docker') {
        logger.info('Запуск через Docker Compose...');
        logger.info('Используйте: docker compose up -d --build');
        return;
    }

    // Collect process definitions
    const procs: ProcDef[] = [
        {
            name: 'auth',
            cwd: join(clusterPath, meta.auth.path),
            command: 'npm',
            args: ['run', 'dev', '--', '--port', String(authPort)],
        },
    ];

    for (const svc of meta.services) {
        procs.push({
            name: `${svc.name}:api`,
            cwd: join(clusterPath, svc.api.path),
            command: 'npx',
            args: ['tsx', 'watch', 'src/app.ts'],
        });

        if (svc.web) {
            procs.push({
                name: `${svc.name}:web`,
                cwd: join(clusterPath, svc.web.path),
                command: 'npm',
                args: ['run', 'dev', '--', '--port', String(svc.web.port)],
            });
        }
    }

    // Set env vars for all processes
    const procEnv: Record<string, string> = {
        ...(process.env as Record<string, string>),
    };
    // Dev URLs — переопределяют prod-значения для локальной разработки
    procEnv['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    procEnv['PUBLIC_IS_PRODUCTION'] = 'false';
    procEnv['CLUSTER_KEY'] = readClusterKey(clusterPath);
    // Разрешённые origins для auth: все веб-сервисы + сам auth
    const origins = meta.services
        .filter((s) => s.web)
        .map((s) => `http://localhost:${s.web!.port}`);
    origins.unshift(`http://localhost:${authPort}`);
    procEnv['ALLOWED_ORIGINS'] = origins.join(',');
    procEnv['AUTH_SERVICE_URL'] = meta.dev.authUrl;
    procEnv['CALLBACK_URL'] = meta.dev.callbackUrl;
    procEnv['PUBLIC_DEV_AUTH_URL'] = '/auth-proxy';
    procEnv['PUBLIC_DEV_API_URL'] = '/api-proxy';
    procEnv['PUBLIC_DEV_CALLBACK_URL'] = meta.dev.callbackUrl;

    // ── Функция ожидания ──
    async function waitForUrl(url: string, timeoutMs = 60000): Promise<void> {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            try {
                const res = await fetch(url);
                if (res.ok) return;
            } catch {}
            await new Promise((r) => setTimeout(r, 1000));
        }
        throw new Error(`Таймаут ожидания ${url}`);
    }

    // ── Сначала auth ──
    const children: ChildProcess[] = [];
    let hasError = false;

    const authProc = procs.find((p) => p.name === 'auth');
    const healthUrl = `http://localhost:${authPort}/auth/health`;

    if (authProc) {
        console.log(
            `[DEV] Запуск auth: ${authProc.command} ${authProc.args.join(' ')} (cwd: ${authProc.cwd})`,
        );

        try {
            const child = spawn(authProc.command, authProc.args, {
                cwd: authProc.cwd,
                stdio: 'inherit',
                env: procEnv,
                shell: true,
            });
            children.push(child);

            child.on('close', (code) => {
                console.log(`[DEV] auth завершился с кодом:`, code);
                if (code !== 0) hasError = true;
            });
            child.on('error', (err) => {
                console.error(`[DEV] Ошибка auth:`, err.message);
                hasError = true;
            });

            logger.info(`Ожидание auth на ${healthUrl}...`);
            await waitForUrl(healthUrl);
            logger.success('Auth готов');
        } catch (err) {
            console.error(`[DEV] Не удалось запустить auth:`, err);
            hasError = true;
        }
    }

    // ── Затем остальные сервисы ──
    const otherProcs = procs.filter((p) => p.name !== 'auth');

    for (const proc of otherProcs) {
        console.log(
            `[DEV] Запуск ${proc.name}: ${proc.command} ${proc.args.join(' ')} (cwd: ${proc.cwd})`,
        );

        try {
            const child = spawn(proc.command, proc.args, {
                cwd: proc.cwd,
                stdio: 'inherit',
                env: procEnv,
                shell: true,
            });

            children.push(child);

            child.on('close', (code) => {
                console.log(`[DEV] ${proc.name} завершился с кодом:`, code);
                if (code !== 0) hasError = true;
            });

            child.on('error', (err) => {
                console.error(`[DEV] Ошибка ${proc.name}:`, err.message);
                hasError = true;
            });
        } catch (err) {
            console.error(`[DEV] Не удалось запустить ${proc.name}:`, err);
            hasError = true;
        }
    }

    if (hasError) {
        logger.error('Некоторые процессы не удалось запустить');
        process.exit(1);
    }

    logger.success('Все процессы запущены. Нажмите Ctrl+C для остановки.');

    // Handle shutdown
    const shutdown = () => {
        logger.info('Завершение всех процессов...');
        for (const child of children) {
            if (!child.killed) {
                child.kill('SIGTERM');
            }
        }
        setTimeout(() => process.exit(0), 3000);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Keep running until all children exit
    await new Promise<void>((resolve) => {
        const checkAlive = setInterval(() => {
            const alive = children.some((c) => !c.killed);
            if (!alive) {
                clearInterval(checkAlive);
                resolve();
            }
        }, 1000);
    });

    if (hasError) {
        process.exit(1);
    }
}
