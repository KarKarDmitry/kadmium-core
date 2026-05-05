import { createInterface } from 'node:readline';
import {
    existsSync,
    mkdirSync,
    writeFileSync,
    readFileSync,
    readdirSync,
} from 'fs';
import { join } from 'path';
import { detectContext, requireClusterRoot } from '../utils/context.js';
import { logger } from '../utils/logger.js';
import { validateServiceName, validatePort } from '../utils/validators.js';
import { run as runClusterConfig } from './config.js';
import spawn from 'cross-spawn';

// ─── Helper: simple template engine ────────────────────────────────────────

export function renderTemplate(
    template: string,
    vars: Record<string, string | number>,
): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
        result = result.replace(
            new RegExp(`\{\{${key}\}\}`, 'g'),
            String(value),
        );
    }
    return result;
}

// ─── Helper: read template file ────────────────────────────────────────────

export function readTemplate(name: string): string {
    const templatePath = join(__dirname, '..', 'templates', name);
    return readFileSync(templatePath, 'utf-8');
}

// ─── Helper: read .env ────────────────────────────────────────────────────

function readEnvValue(clusterPath: string, key: string, def: string): string {
    const envPath = join(clusterPath, '.env');
    if (!existsSync(envPath)) return def;
    const content = readFileSync(envPath, 'utf-8');
    const match = content.match(new RegExp(`^${key}=(.+)`, 'm'));
    return match ? match[1].trim() : def;
}

// ─── Helper: find next available port ──────────────────────────────────────

function findNextPort(clusterPath: string): { api: number; web: number } {
    const servicesPath = join(clusterPath, 'services');
    if (!existsSync(servicesPath)) return { api: 3001, web: 5174 };

    let maxApi = 3000;
    let maxWeb = 5173;

    const entries = readdirSync(servicesPath, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const pkgPath = join(
            servicesPath,
            entry.name,
            'server',
            'package.json',
        );
        if (existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
                if (
                    pkg._port &&
                    typeof pkg._port === 'number' &&
                    pkg._port > maxApi
                ) {
                    maxApi = pkg._port;
                }
            } catch {
                /* ignore */
            }
        }
        const webPkgPath = join(
            servicesPath,
            entry.name,
            'web',
            'package.json',
        );
        if (existsSync(webPkgPath)) {
            try {
                const pkg = JSON.parse(readFileSync(webPkgPath, 'utf-8'));
                if (
                    pkg._port &&
                    typeof pkg._port === 'number' &&
                    pkg._port > maxWeb
                ) {
                    maxWeb = pkg._port;
                }
            } catch {
                /* ignore */
            }
        }
    }

    return { api: maxApi + 1, web: maxWeb + 1 };
}

// ─── Helper: get cluster config ────────────────────────────────────────────

interface ClusterConf {
    domain: string;
    ip: string;
    clusterKey: string;
    webType: 'svelte' | 'empty' | 'none';
    ssl: 'mkcert' | 'self' | 'none';
    authExternalUrl: string;
    authInternalUrl: string;
}

function getClusterConf(clusterPath: string): ClusterConf {
    return {
        domain: readEnvValue(clusterPath, 'DOMAIN', 'kadmium.local'),
        ip: readEnvValue(clusterPath, 'IP', '127.0.0.1'),
        clusterKey: readEnvValue(
            clusterPath,
            'CLUSTER_KEY',
            crypto.randomUUID(),
        ),
        webType: readEnvValue(
            clusterPath,
            'WEB_TYPE',
            'none',
        ) as ClusterConf['webType'],
        ssl: readEnvValue(clusterPath, 'SSL', 'none') as ClusterConf['ssl'],
        authExternalUrl: readEnvValue(
            clusterPath,
            'AUTH_EXTERNAL_URL',
            'https://auth.kadmium.local',
        ),
        authInternalUrl: readEnvValue(
            clusterPath,
            'AUTH_INTERNAL_URL',
            'http://auth:4000',
        ),
    };
}

// ─── File creation helpers ─────────────────────────────────────────────────

function createServerFiles(
    servicePath: string,
    name: string,
    port: number,
    conf: ClusterConf,
): void {
    const serverPath = join(servicePath, 'server');
    mkdirSync(join(serverPath, 'src', 'domain', 'controllers'), {
        recursive: true,
    });
    mkdirSync(join(serverPath, 'src', 'schemas'), { recursive: true });

    const sslProtocol = conf.ssl !== 'none' ? 'https' : 'http';

    const vars = {
        serviceName: name,
        port,
        domain: conf.domain,
        appId: name,
        clusterKey: conf.clusterKey,
        authExternalUrl: conf.authExternalUrl,
        protocol: sslProtocol,
    };

    // app.ts
    const appContent = renderTemplate(readTemplate('server/app.ts.hbs'), vars);
    writeFileSync(join(serverPath, 'src', 'app.ts'), appContent, 'utf-8');

    // kadmium.config.ts
    const configContent = renderTemplate(
        readTemplate('server/kadmium.config.ts.hbs'),
        vars,
    );
    writeFileSync(
        join(serverPath, 'src', 'kadmium.config.ts'),
        configContent,
        'utf-8',
    );

    // package.json
    const pkgContent = renderTemplate(
        readTemplate('server/package.json.hbs'),
        vars,
    );
    writeFileSync(join(serverPath, 'package.json'), pkgContent, 'utf-8');

    // tsconfig.json
    const tsconfig = {
        compilerOptions: {
            target: 'ES2022',
            module: 'node16',
            moduleResolution: 'node16',
            lib: ['ES2022'],
            outDir: './dist',
            rootDir: './src',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            resolveJsonModule: true,
            declaration: true,
            sourceMap: true,
            types: ['node'],
        },
        include: ['src/**/*.ts'],
        exclude: ['node_modules', 'dist'],
    };
    writeFileSync(
        join(serverPath, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2),
        'utf-8',
    );

    // Dockerfile
    const dockerContent = renderTemplate(
        readTemplate('docker/Dockerfile.api.hbs'),
        vars,
    );
    writeFileSync(join(serverPath, 'Dockerfile'), dockerContent, 'utf-8');
}

function spawnPromise(cmd: any, args: any, opts = {}) {
    return new Promise<void>((resolve, reject) => {
        const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${cmd} exited with code ${code}`));
        });
        child.on('error', reject);
    });
}

async function createWebFiles(
    servicePath: string,
    name: string,
    port: number,
    conf: ClusterConf,
): Promise<void> {
    const webPath = join(servicePath, 'web');
    const shell = process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe';
    const protocol = conf.ssl !== 'none' ? 'https' : 'http';

    // Create SvelteKit project using the official scaffolding tool
    logger.info(`Создание SvelteKit проекта для "${name}"...`);

    // Шаг 1: Создание проекта
    await spawnPromise(
        'npx',
        [
            '-y',
            'sv@latest',
            'create',
            '--template',
            'minimal',
            '--types',
            'ts',
            '--no-add-ons',
            '--install',
            'npm',
            'web',
        ],
        {
            cwd: servicePath,
            stdio: 'inherit',
        },
    );

    // Шаг 2: Добавление Tailwind CSS с плагинами typography и forms
    await spawnPromise(
        'npx',
        [
            '-y',
            'sv@latest',
            'add',
            'tailwindcss=plugins:typography,forms', // Инлайн-синтаксис для плагинов
            'sveltekit-adapter=adapter:node',
            '--install',
            'npm',
        ],
        {
            cwd: webPath,
            stdio: 'inherit',
        },
    );

    // Update svelte.config.js to use adapter-node
    const svelteConfig = `import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    kit: { adapter: adapter() }
};

export default config;
`;
    writeFileSync(join(webPath, 'svelte.config.js'), svelteConfig, 'utf-8');

    // Create auth store
    const authStoreContent = `type AuthStateListener = (state: AuthState) => void;

export interface AuthState {
    accessToken: string | null;
    user: { id: string; username: string } | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

class AuthStore {
    private _state: AuthState = {
        accessToken: null,
        user: null,
        isAuthenticated: false,
        isLoading: true,
    };

    private listeners: Set<AuthStateListener> = new Set();

    getState(): AuthState {
        return { ...this._state };
    }

    setAccessToken(token: string, user?: { id: string; username: string }): void {
        this._state.accessToken = token;
        this._state.isAuthenticated = true;
        this._state.isLoading = false;
        if (user) this._state.user = user;
        this.notify();
    }

    setLoading(loading: boolean): void {
        this._state.isLoading = loading;
        this.notify();
    }

    clear(): void {
        this._state = { accessToken: null, user: null, isAuthenticated: false, isLoading: false };
        this.notify();
    }

    subscribe(listener: AuthStateListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        const snapshot = this.getState();
        for (const listener of this.listeners) {
            listener(snapshot);
        }
    }
}

export const authStore = new AuthStore();
`;

    // Create api-client
    const apiClientContent = `import { env } from '$env/dynamic/public';
import { authStore } from '$lib/stores/auth-store';

const isProd = env.PUBLIC_IS_PRODUCTION === 'true';
const AUTH_URL = isProd ? env.PUBLIC_AUTH_URL : env.PUBLIC_DEV_AUTH_URL;
const API_BASE_URL = isProd ? env.PUBLIC_API_URL : env.PUBLIC_DEV_API_URL;

class ApiClient {
    private refreshPromise: Promise<boolean> | null = null;

    async fetch(url: string | URL, options?: RequestInit): Promise<Response> {
        const resolvedUrl = typeof url === 'string' && url.startsWith('/') ? \`\${API_BASE_URL}\${url}\` : url;
        const token = authStore.getState().accessToken;
        const headers: Record<string, string> = { ...((options?.headers as Record<string, string>) || {}) };

        if (token) headers['Authorization'] = \`Bearer \${token}\`;

        const response = await fetch(resolvedUrl, { ...options, headers });

        if (response.status === 401) {
            const refreshed = await this.atomicRefresh();
            if (refreshed) {
                const newToken = authStore.getState().accessToken;
                const retryHeaders: Record<string, string> = { ...((options?.headers as Record<string, string>) || {}) };
                if (newToken) retryHeaders['Authorization'] = \`Bearer \${newToken}\`;
                return fetch(resolvedUrl, { ...options, headers: retryHeaders });
            } else {
                const returnUrl = encodeURIComponent(window.location.href);
                window.location.href = \`\${AUTH_URL}/auth/authorize?app_id=${name}&redirect_uri=\${returnUrl}\`;
                throw new Error('Session expired');
            }
        }

        return response;
    }

    private async atomicRefresh(): Promise<boolean> {
        if (this.refreshPromise) return this.refreshPromise;
        this.refreshPromise = this.doRefresh();
        const result = await this.refreshPromise;
        this.refreshPromise = null;
        return result;
    }

    private async doRefresh(): Promise<boolean> {
        try {
            const response = await fetch(\`\${AUTH_URL}/auth/refresh\`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ app_id: '${name}' }),
            });
            if (response.ok) {
                const result = await response.json();
                authStore.setAccessToken(result.data.access_key);
                return true;
            }
        } catch { /* ignore */ }
        authStore.clear();
        return false;
    }

    async logout(): Promise<void> {
        try { await fetch(\`\${AUTH_URL}/auth/logout\`, { method: 'POST', credentials: 'include' }); } catch { /* ignore */ }
        authStore.clear();
    }

    async initSession(): Promise<boolean> {
        try {
            const response = await fetch(\`\${AUTH_URL}/auth/refresh\`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ app_id: '${name}' }),
            });
            if (response.ok) {
                const result = await response.json();
                authStore.setAccessToken(result.data.access_key);
                return true;
            }
        } catch { /* ignore */ }
        authStore.setLoading(false);
        return false;
    }

    async exchangeCode(code: string): Promise<boolean> {
        try {
            const response = await this.fetch(\`/auth/callback\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });
            if (response.ok) {
                const result = await response.json();
                authStore.setAccessToken(result.access_token);
                return true;
            }
        } catch { /* ignore */ }
        return false;
    }
}

export const apiClient = new ApiClient();
`;

    mkdirSync(join(webPath, 'src', 'lib', 'stores'), { recursive: true });
    writeFileSync(
        join(webPath, 'src', 'lib', 'stores', 'auth-store.ts'),
        authStoreContent,
        'utf-8',
    );
    writeFileSync(
        join(webPath, 'src', 'lib', 'api-client.ts'),
        apiClientContent,
        'utf-8',
    );

    // +page.svelte with OAuth login
    const pageSvelte = `<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { env } from '$env/dynamic/public';
    import { authStore } from '$lib/stores/auth-store';
    import { apiClient } from '$lib/api-client';

    const isProd = env.PUBLIC_IS_PRODUCTION === 'true';

    let isLoading = $state(true);
    let items: any[] = $state([]);
    let message = $state('');
    let stateProp = $state(authStore.getState());

    onMount(() => {
        if (browser) {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            if (code) {
                handleCallback(code);
            } else {
                restoreSession();
            }
        }
        const unsub = authStore.subscribe((s) => { stateProp = s; });
        return unsub;
    });

    async function handleCallback(code: string) {
        const success = await apiClient.exchangeCode(code);
        if (success) {
            window.history.replaceState({}, '', '/');
            stateProp = authStore.getState();
        } else {
            message = 'Authorization failed';
        }
        isLoading = false;
    }

    async function restoreSession() {
        await apiClient.initSession();
        stateProp = authStore.getState();
        isLoading = false;
    }

    function login() {
        const returnUrl = encodeURIComponent(window.location.origin + '/');
        const authUrl = isProd ? env.PUBLIC_AUTH_URL : env.PUBLIC_DEV_AUTH_URL;
        window.location.href = \`\${authUrl}/auth/authorize?app_id=${name}&redirect_uri=\${returnUrl}\`;
    }

    async function handleLogout() {
        await apiClient.logout();
        stateProp = authStore.getState();
    }
<\/script>

<div class="container">
    {#if isLoading}
        <p>Loading...</p>
    {:else if !stateProp.isAuthenticated}
        <div class="card">
            <h1>${name}</h1>
            <p>Sign in to access the application.</p>
            <button onclick={login}>Sign in with Auth</button>
        </div>
    {:else}
        <div class="card">
            <h1>${name}</h1>
            <p>Authenticated as <strong>{stateProp.user?.username}</strong></p>
            <button onclick={handleLogout}>Logout</button>
        </div>
    {/if}
</div>

<style>
    .container { display: flex; justify-content: center; align-items: center; min-height: 80vh; }
    .card { text-align: center; padding: 2rem; border: 1px solid #ddd; border-radius: 8px; max-width: 400px; }
    button { margin-top: 1rem; padding: 0.5rem 1.5rem; border: none; border-radius: 4px; cursor: pointer; }
    button:first-of-type { background: #2563eb; color: white; }
    button:last-of-type { background: #dc2626; color: white; }
</style>
`;
    mkdirSync(join(webPath, 'src', 'routes'), { recursive: true });
    writeFileSync(
        join(webPath, 'src', 'routes', '+page.svelte'),
        pageSvelte,
        'utf-8',
    );

    // Dockerfile
    const dockerContent = renderTemplate(
        readTemplate('docker/Dockerfile.spa.hbs'),
        { name, port, serviceName: name + '-web' },
    );
    writeFileSync(join(webPath, 'Dockerfile'), dockerContent, 'utf-8');

    logger.success(`Web: services/ ${name}/web/ (port ${port})`);
}

// ─── Argument parsing ──────────────────────────────────────────────────────

interface AddFlags {
    name: string | null;
    port: number | null;
    noWeb: boolean;
    withWeb: boolean;
    force: boolean;
    noConfig: boolean;
}

function parseArgs(args: string[]): AddFlags {
    const flags: AddFlags = {
        name: null,
        port: null,
        noWeb: false,
        withWeb: false,
        force: false,
        noConfig: false,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--name':
                flags.name = args[++i] || null;
                break;
            case '--port':
                flags.port = parseInt(args[++i], 10) || null;
                break;
            case '--no-web':
                flags.noWeb = true;
                break;
            case '--with-web':
                flags.withWeb = true;
                break;
            case '--force':
                flags.force = true;
                break;
            case '--no-config':
                flags.noConfig = true;
                break;
        }
    }

    return flags;
}

// ─── Interactive prompts (simple readline) ─────────────────────────────────

async function askQuestion(prompt: string): Promise<string> {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
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

// ─── Main ──────────────────────────────────────────────────────────────────

export async function run(args: string[]): Promise<void> {
    const ctx = detectContext(process.cwd());
    requireClusterRoot(ctx, 'cluster:add');

    const clusterPath = ctx.path;
    const flags = parseArgs(args);
    const conf = getClusterConf(clusterPath);
    const ports = findNextPort(clusterPath);

    // ── 1. Service name ──
    let serviceName = flags.name;
    if (!serviceName) {
        serviceName = await askQuestion('📛 Имя сервиса: ');
    }

    const nameError = validateServiceName(serviceName);
    if (nameError) {
        logger.error(nameError.message);
        process.exit(1);
    }

    // ── 2. Check if exists ──
    const serviceDir = join(clusterPath, 'services', serviceName);
    if (existsSync(serviceDir)) {
        const overwrite =
            flags.force ||
            (await askYesNo(
                `⚠️ Сервис "${serviceName}" уже существует. Пересоздать?`,
                false,
            ));
        if (!overwrite) {
            logger.warn('Отменено');
            return;
        }
        // Remove old
        const { rmSync } = await import('fs');
        rmSync(serviceDir, { recursive: true, force: true });
    }

    // ── 3. Port ──
    let apiPort = flags.port ?? ports.api;
    const portError = validatePort(apiPort);
    if (portError) {
        logger.error(portError.message);
        process.exit(1);
    }

    // ── 4. Web ──
    const hasWeb = conf.webType !== 'none' || flags.withWeb;
    const finalWeb = flags.noWeb ? false : hasWeb;
    const webPort = finalWeb ? ports.web : 0;

    // ── 5. Create directories ──
    mkdirSync(join(clusterPath, 'services', serviceName, 'server'), {
        recursive: true,
    });

    logger.blank();
    logger.separator(`Creating ${serviceName}`);

    // ── 6. Generate server files ──
    createServerFiles(
        join(clusterPath, 'services', serviceName),
        serviceName,
        apiPort,
        conf,
    );
    logger.success(`Server: services/${serviceName}/server/ (port ${apiPort})`);

    // ── 7. Generate web files (optional) ──
    if (finalWeb) {
        await createWebFiles(
            join(clusterPath, 'services', serviceName),
            serviceName,
            webPort,
            conf,
        );
        logger.success(`Web: services/${serviceName}/web/ (port ${webPort})`);
    }

    // ── 8. Update configs ──
    if (!flags.noConfig) {
        logger.blank();
        logger.info('Обновление конфигов...');
        await runClusterConfig(args);
    }

    // ── 9. Summary ──
    logger.blank();
    logger.separator('Готово');
    logger.success(`Сервис "${serviceName}" добавлен`);
    logger.blank();
    logger.info(`Запустите: docker compose up -d --build ${serviceName}`);
}
