import { existsSync } from 'fs';
import { join } from 'path';

export type ContextType =
    | { type: 'cluster-root'; path: string }
    | { type: 'service-root'; path: string }
    | { type: 'api-service'; path: string }
    | { type: 'unknown'; path: string };

/**
 * Определяет контекст, в котором запущена команда.
 * Анализирует содержимое директории по наличию характерных файлов/папок.
 *
 * @param cwd — рабочая директория (process.cwd())
 */
export function detectContext(cwd: string): ContextType {
    // 1. Корень кластера: есть auth/ + docker-compose.yml
    if (
        existsSync(join(cwd, 'auth')) &&
        existsSync(join(cwd, 'docker-compose.yml'))
    ) {
        return { type: 'cluster-root', path: cwd };
    }

    // 2. Корень сервиса (API + Web): есть server/ + web/
    if (existsSync(join(cwd, 'server')) && existsSync(join(cwd, 'web'))) {
        return { type: 'service-root', path: cwd };
    }

    // 3. API сервис (на базе kadmium-core): есть kadmium.config.ts в src/, dist/ или корне + src/app.ts или dist/app.js
    if (
        (existsSync(join(cwd, 'src', 'kadmium.config.ts')) ||
            existsSync(join(cwd, 'dist', 'kadmium.config.js')) ||
            existsSync(join(cwd, 'kadmium.config.ts'))) &&
        (existsSync(join(cwd, 'src', 'app.ts')) ||
            existsSync(join(cwd, 'dist', 'app.js')))
    ) {
        return { type: 'api-service', path: cwd };
    }

    // 4. Неизвестно
    return { type: 'unknown', path: cwd };
}

/**
 * Проверяет, является ли контекст корнем кластера.
 * Если нет — выводит сообщение и завершает процесс.
 */
export function requireClusterRoot(
    ctx: ContextType,
    command: string,
): asserts ctx is { type: 'cluster-root'; path: string } {
    if (ctx.type !== 'cluster-root') {
        console.error(
            `❌ Команда "${command}" должна запускаться из корня кластера.`,
        );
        console.error(`   Текущая директория: ${ctx.path}`);
        console.error(
            `   Корень кластера содержит: auth/, services/, docker-compose.yml`,
        );
        process.exit(1);
    }
}

/**
 * Проверяет, является ли контекст API сервисом.
 * Если нет — выводит сообщение и завершает процесс.
 */
export function requireApiService(
    ctx: ContextType,
    command: string,
): asserts ctx is { type: 'api-service'; path: string } {
    if (ctx.type !== 'api-service') {
        console.error(
            `❌ Команда "${command}" должна запускаться из директории API сервиса.`,
        );
        console.error(`   Текущая директория: ${ctx.path}`);
        console.error(
            `   API сервис содержит: kadmium.config.ts, src/app.ts или dist/app.js`,
        );
        process.exit(1);
    }
}
