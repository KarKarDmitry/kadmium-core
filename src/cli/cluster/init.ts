import {
    existsSync,
    mkdirSync,
    writeFileSync,
    readFileSync,
    readdirSync,
    cpSync,
    rmSync,
} from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { detectContext } from '../utils/context.js';
import { logger } from '../utils/logger.js';
import {
    validateServiceName,
    validatePort,
    validateDomain,
    validateIp,
    validateEmptyDir,
} from '../utils/validators.js';
import { run as runClusterAdd } from './add.js';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InitFlags {
    dir: string | null;
    domain: string | null;
    ip: string | null;
    web: 'svelte' | 'empty' | 'none' | null;
    dns: boolean | null;
    ssl: 'mkcert' | 'self' | 'none' | null;
    services: string | null;
    skipGit: boolean;
    skipInstall: boolean;
    force: boolean;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS = {
    domain: 'kadmium.local',
    ip: '127.0.0.1',
    web: 'svelte' as const,
    dns: false,
    ssl: 'none' as const,
};

// ─── Argument parsing ────────────────────────────────────────────────────────

function parseArgs(args: string[]): InitFlags {
    const flags: InitFlags = {
        dir: null,
        domain: null,
        ip: null,
        web: null,
        dns: null,
        ssl: null,
        services: null,
        skipGit: false,
        skipInstall: false,
        force: false,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--dir':
                flags.dir = args[++i] || null;
                break;
            case '--domain':
                flags.domain = args[++i] || null;
                break;
            case '--ip':
                flags.ip = args[++i] || null;
                break;
            case '--web':
                const v = args[++i];
                if (v === 'svelte' || v === 'empty' || v === 'none')
                    flags.web = v;
                break;
            case '--dns':
                flags.dns = true;
                break;
            case '--no-dns':
                flags.dns = false;
                break;
            case '--ssl':
                const s = args[++i];
                if (s === 'mkcert' || s === 'self' || s === 'none')
                    flags.ssl = s;
                break;
            case '--services':
                flags.services = args[++i] || null;
                break;
            case '--skip-git':
                flags.skipGit = true;
                break;
            case '--skip-install':
                flags.skipInstall = true;
                break;
            case '--force':
                flags.force = true;
                break;
        }
    }

    return flags;
}

// ─── Interactive prompts ─────────────────────────────────────────────────────

async function askQuestion(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        process.stdout.write(prompt);
        process.stdin.once('data', (data) => {
            resolve(data.toString().trim());
        });
    });
}

async function askChoice<T>(
    prompt: string,
    options: T[],
    defaultIdx: number,
): Promise<T> {
    const labels = options.map((o, i) =>
        i === defaultIdx ? `[${String(o)}]` : String(o),
    );
    const hint = labels.join(' | ');
    const answer = await askQuestion(`${prompt} (${hint}): `);
    if (!answer) return options[defaultIdx];
    const idx = options.findIndex(
        (o) => String(o).toLowerCase() === answer.toLowerCase(),
    );
    return idx >= 0 ? options[idx] : options[defaultIdx];
}

async function askYesNo(
    prompt: string,
    defaultAnswer: boolean,
): Promise<boolean> {
    const hint = defaultAnswer ? '[Y/n]' : '[y/N]';
    const answer = await askQuestion(`${prompt} ${hint} `);
    if (answer.toLowerCase() === 'y') return true;
    if (answer.toLowerCase() === 'n') return false;
    return defaultAnswer;
}

// ─── File generation ────────────────────────────────────────────────────────

function generateEnvFile(
    clusterPath: string,
    domain: string,
    ip: string,
    ssl: string,
    dns: boolean,
    web: string,
    authExternalUrl: string,
    authInternalUrl: string,
): string {
    const lines: string[] = [];
    lines.push(`# Kadmium Cluster — ${domain}`);
    lines.push(`DOMAIN=${domain}`);
    lines.push(`IP=${ip}`);
    lines.push(`SSL=${ssl}`);
    lines.push(`DNS=${dns}`);
    lines.push(`WEB_TYPE=${web}`);
    lines.push('');
    lines.push(`# Auth URLs`);
    lines.push(`AUTH_EXTERNAL_URL=${authExternalUrl}`);
    lines.push(`AUTH_INTERNAL_URL=${authInternalUrl}`);
    lines.push(``);
    lines.push(`# Auth`);
    lines.push(`JWT_SECRET=${crypto.randomUUID()}`);
    lines.push(`CLUSTER_KEY=${crypto.randomUUID()}`);
    lines.push(`ADMIN_PASSWORD=admin123`);
    lines.push('');
    lines.push(`# SSL`);
    if (ssl !== 'none') {
        lines.push(`SSL_CERT_PATH=`);
        lines.push(`SSL_KEY_PATH=`);
    }
    lines.push('');
    return lines.join('\n');
}

function generateGitIgnore(): string {
    return [
        'node_modules/',
        'build/',
        '.svelte-kit/',
        '.env',
        '*.db',
        'keys/',
        '*.tgz',
        'dist/',
        '.kadmium/',
        '',
    ].join('\n');
}

// ─── Auth setup ──────────────────────────────────────────────────────────────

function setupAuth(clusterPath: string): void {
    const authPath = join(clusterPath, 'auth');

    // Try to find kadmium-auth source
    // First check: local kadmium-auth directory (development)
    const localAuth = join(process.cwd(), '..', 'kadmium-auth');
    if (existsSync(join(localAuth, 'package.json'))) {
        logger.info('Копирование kadmium-auth из локальной директории...');
        cpSync(localAuth, authPath, {
            recursive: true,
            force: true,
        });
        // Remove node_modules from copied auth
        const nmPath = join(authPath, 'node_modules');
        if (existsSync(nmPath)) {
            const { rmSync } = require('fs');
            rmSync(nmPath, { recursive: true, force: true });
        }
        return;
    }

    // Second check: npm package
    try {
        const npmAuth = join(
            execSync('npm root -g', { encoding: 'utf-8' }).trim(),
            '@karkardmitry',
            'kadmium-auth',
        );
        if (existsSync(npmAuth)) {
            logger.info('Копирование kadmium-auth из глобального npm...');
            cpSync(npmAuth, authPath, { recursive: true, force: true });
            return;
        }
    } catch {
        // ignore
    }

    // Fallback: create minimal auth placeholder
    logger.warn(
        'kadmium-auth не найден. Создаётся заглушка. Установите вручную.',
    );
    mkdirSync(authPath, { recursive: true });
    writeFileSync(
        join(authPath, 'README.md'),
        '# kadmium-auth\n\nУстановите вручную: `npm install @karkardmitry/kadmium-auth`\n',
        'utf-8',
    );
}

// ─── Git init ────────────────────────────────────────────────────────────────

function initGit(clusterPath: string): void {
    try {
        execSync('git init', { cwd: clusterPath, stdio: 'pipe' });
        execSync('git add -A', { cwd: clusterPath, stdio: 'pipe' });
        execSync('git commit -m "init: kadmium cluster scaffold"', {
            cwd: clusterPath,
            stdio: 'pipe',
        });
        logger.success('Git репозиторий инициализирован');
    } catch (err) {
        logger.warn('Git не удался — пропускаем');
    }
}

// ─── Создание структуры ─────────────────────────────────────────────────────

function createScaffold(clusterPath: string): void {
    const dirs = ['auth', 'services', 'nginx', 'dns', 'scripts'];

    for (const dir of dirs) {
        mkdirSync(join(clusterPath, dir), { recursive: true });
    }

    // .gitignore
    writeFileSync(
        join(clusterPath, '.gitignore'),
        generateGitIgnore(),
        'utf-8',
    );

    // docker-compose.yml placeholder
    writeFileSync(
        join(clusterPath, 'docker-compose.yml'),
        '# Generated by kadmium cluster:config\nservices:\n',
        'utf-8',
    );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function run(args: string[]): Promise<void> {
    const flags = parseArgs(args);

    // ── 1. Определяем директорию кластера ──
    let clusterPath = flags.dir
        ? join(process.cwd(), flags.dir)
        : process.cwd();

    // If current dir is not empty and --dir not specified, ask
    const emptyErr = validateEmptyDir(clusterPath);
    if (emptyErr && !flags.force && !flags.dir) {
        const createNew = await askYesNo(
            `⚠️ Текущая директория не пуста. Создать новую папку?`,
            true,
        );
        if (createNew) {
            const dirName = await askQuestion(
                '📁 Название папки кластера (или . для текущей): ',
            );
            clusterPath =
                dirName === '.'
                    ? clusterPath
                    : join(process.cwd(), dirName || 'kadmium-cluster');
        } else if (!flags.force) {
            logger.error('Отменено');
            return;
        }
    }

    if (flags.force && emptyErr) {
        logger.warn('Режим --force: перезапись существующих файлов');
    }

    // ── 2. Вопросы (с поддержкой флагов) ──
    const domain =
        (flags.domain ??
            (await askQuestion(`🌐 Домен (${DEFAULTS.domain}): `))) ||
        DEFAULTS.domain;

    const domainErr = validateDomain(domain);
    if (domainErr) {
        logger.error(domainErr.message);
        process.exit(1);
    }

    const ip =
        (flags.ip ?? (await askQuestion(`📌 IP сервера (${DEFAULTS.ip}): `))) ||
        DEFAULTS.ip;

    const ipErr = validateIp(ip);
    if (ipErr) {
        logger.error(ipErr.message);
        process.exit(1);
    }

    const webType =
        flags.web ??
        (await askChoice(
            '🖥️ Web часть для сервисов',
            ['svelte', 'empty', 'none'] as const,
            0,
        ));

    const useDns =
        flags.dns !== null
            ? flags.dns
            : await askYesNo('🌍 Поднять DNS сервер (dnsmasq)?', DEFAULTS.dns);

    const sslType =
        flags.ssl ??
        (await askChoice(
            '🔒 SSL сертификаты',
            ['mkcert', 'self', 'none'] as const,
            2, // default: none
        ));

    const protocol = sslType !== 'none' ? 'https' : 'http';
    const defaultAuthUrl = `${protocol}://auth.${domain}`;
    const authExternalUrl =
        (await askQuestion(
            `🔐 Внешний URL auth сервиса (${defaultAuthUrl}): `,
        )) || defaultAuthUrl;
    const authInternalUrl = 'http://auth:4000';

    const servicesList =
        flags.services ??
        (await askQuestion('📦 Список сервисов (через запятую или пусто): '));

    logger.blank();
    logger.separator('Создание кластера');

    // ── 3. Создание структуры ──
    mkdirSync(clusterPath, { recursive: true });
    createScaffold(clusterPath);

    // ── 4. .env ──
    const envContent = generateEnvFile(
        clusterPath,
        domain,
        ip,
        sslType,
        useDns,
        webType,
        authExternalUrl,
        authInternalUrl,
    );
    writeFileSync(join(clusterPath, '.env'), envContent, 'utf-8');
    logger.success('.env создан');

    // ── 5. Auth ──
    logger.info('Настройка auth...');
    setupAuth(clusterPath);

    // ── 6. Сервисы (через cluster:add) ──
    if (servicesList && servicesList.trim()) {
        const serviceNames = servicesList
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

        for (const svc of serviceNames) {
            const svcErr = validateServiceName(svc);
            if (svcErr) {
                logger.warn(`Пропуск "${svc}": ${svcErr.message}`);
                continue;
            }

            logger.blank();
            logger.info(`Добавление сервиса "${svc}"...`);

            // Build flags for cluster:add
            const addArgs: string[] = ['--name', svc, '--force', '--no-config'];

            if (webType === 'none') {
                addArgs.push('--no-web');
            } else {
                addArgs.push('--with-web');
            }

            await runClusterAdd(addArgs);
        }
    }

    // ── 7. Обновление конфигов ──
    const { run: runConfig } = await import('./config.js');
    await runConfig(['--force']);

    // ── 8. Установка dev-зависимостей ──
    if (!flags.skipInstall) {
        logger.info('Установка dev-зависимостей (concurrently)...');
        try {
            execSync('npm init -y', {
                cwd: clusterPath,
                stdio: 'pipe',
            });
            execSync('npm install --save-dev concurrently', {
                cwd: clusterPath,
                stdio: 'pipe',
            });
            logger.success('concurrently установлен');
        } catch (err) {
            logger.warn(
                'Не удалось установить concurrently. ' +
                    'Установите вручную: npm install --save-dev concurrently',
            );
        }
    }

    // ── 9. Git ──
    if (!flags.skipGit) {
        initGit(clusterPath);
    }

    // ── 10. Итог ──
    logger.blank();
    logger.separator('Кластер создан');
    logger.success(`Директория: ${clusterPath}`);
    logger.success(`Домен: ${domain}`);
    logger.success(
        `Сервисов: ${servicesList ? servicesList.split(',').length : 0}`,
    );
    logger.blank();
    logger.info(`Запустите:`);
    logger.info(`  cd ${clusterPath}`);
    logger.info(`  docker compose up -d --build`);
    logger.blank();
    logger.info(`Или для прода:`);
    logger.info(`  kadmium cluster:deploy`);
}
