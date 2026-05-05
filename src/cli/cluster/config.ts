import {
    readFileSync,
    writeFileSync,
    existsSync,
    readdirSync,
    mkdirSync,
} from 'fs';
import { join } from 'path';
import { detectContext, requireClusterRoot } from '../utils/context.js';
import { logger } from '../utils/logger.js';
import { writeMeta, type KadmiumMeta } from '../utils/cluster-meta.js';
import { readTemplate, renderTemplate } from './add.js';

// ─── Типы ───────────────────────────────────────────────────────────────────

interface ServiceInfo {
    name: string;
    port: number;
    webPort: number;
    hasWeb: boolean;
}

interface ClusterConfig {
    domain: string;
    ip: string;
    ssl: 'mkcert' | 'self' | 'none';
    sslCertPath: string;
    sslKeyPath: string;
    dns: boolean;
    webType: 'svelte' | 'empty' | 'none';
    authExternalUrl: string;
    authInternalUrl: string;
}

// ─── Чтение конфига кластера ───────────────────────────────────────────────

function readClusterConfig(clusterPath: string): ClusterConfig {
    const envPath = join(clusterPath, '.env');
    const envContent = existsSync(envPath)
        ? readFileSync(envPath, 'utf-8')
        : '';

    const getEnv = (key: string, def: string): string => {
        const match = envContent.match(new RegExp(`^${key}=(.+)`, 'm'));
        return match ? match[1].trim() : def;
    };

    return {
        domain: getEnv('DOMAIN', 'kadmium.local'),
        ip: getEnv('IP', '127.0.0.1'),
        ssl: getEnv('SSL', 'none') as ClusterConfig['ssl'],
        sslCertPath: getEnv('SSL_CERT_PATH', ''),
        sslKeyPath: getEnv('SSL_KEY_PATH', ''),
        dns: getEnv('DNS', 'false') === 'true',
        webType: getEnv('WEB_TYPE', 'none') as ClusterConfig['webType'],
        authExternalUrl: getEnv(
            'AUTH_EXTERNAL_URL',
            `https://auth.${getEnv('DOMAIN', 'kadmium.local')}`,
        ),
        authInternalUrl: getEnv('AUTH_INTERNAL_URL', 'http://auth:4000'),
    };
}

// ─── Сканирование сервисов ─────────────────────────────────────────────────

function scanServices(clusterPath: string): ServiceInfo[] {
    const servicesPath = join(clusterPath, 'services');
    if (!existsSync(servicesPath)) return [];

    const services: ServiceInfo[] = [];
    const entries = readdirSync(servicesPath, { withFileTypes: true });

    let lastPort = 3000;
    let lastWebPort = 5173;

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const serverPath = join(servicesPath, entry.name, 'server');
        const webPath = join(servicesPath, entry.name, 'web');

        if (!existsSync(serverPath)) continue;

        // Читаем порт из package.json сервера
        const pkgPath = join(serverPath, 'package.json');
        let port = ++lastPort;
        if (existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
                if (pkg._port) port = pkg._port;
            } catch {
                // игнор
            }
        }

        const hasWeb = existsSync(webPath);
        const webPort = hasWeb ? ++lastWebPort : 0;

        services.push({ name: entry.name, port, webPort, hasWeb });
    }

    return services;
}

// ─── Шаблоны (простые строки) ──────────────────────────────────────────────

function generateNginxConfig(
    services: ServiceInfo[],
    config: ClusterConfig,
): string {
    const sslBlock = (domain: string) =>
        config.ssl !== 'none'
            ? `    ssl_certificate ${config.sslCertPath || `/etc/nginx/keys/wildcard.${config.domain}.pem`};
    ssl_certificate_key ${config.sslKeyPath || `/etc/nginx/keys/wildcard.${config.domain}-key.pem`};`
            : '';

    const listen = config.ssl !== 'none' ? '443 ssl' : '80';

    const authHost = new URL(config.authExternalUrl).hostname;

    let result = '# Kadmium Auth Server\n';
    result += `server {\n    listen ${listen};\n    server_name ${authHost};\n\n`;
    if (sslBlock('auth')) result += `  ${sslBlock('auth')}\n\n`;
    result += `    location / {\n        proxy_pass http://auth:4000;\n`;
    result += `        proxy_set_header Host $host;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_set_header X-Forwarded-For $remote_addr;\n    }\n}\n\n`;

    for (const svc of services) {
        result += `# ${svc.name}\n`;
        result += `server {\n    listen ${listen};\n    server_name ${svc.name}.${config.domain};\n\n`;
        if (sslBlock(svc.name)) result += `  ${sslBlock(svc.name)}\n\n`;
        result += `    location / {\n        proxy_pass http://${svc.name}:${svc.port};\n`;
        result += `        proxy_set_header Host $host;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_set_header X-Forwarded-For $remote_addr;\n`;
        result += `    }\n}\n\n`;

        if (svc.hasWeb) {
            result += `# ${svc.name} (web)\n`;
            result += `server {\n    listen ${listen};\n    server_name ${svc.name}-web.${config.domain};\n\n`;
            if (sslBlock(`${svc.name}-web`))
                result += `  ${sslBlock(`${svc.name}-web`)}\n\n`;
            result += `    location / {\n        proxy_pass http://${svc.name}-web:${svc.webPort};\n`;
            result += `        proxy_set_header Host $host;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_set_header X-Forwarded-For $remote_addr;\n`;
            result += `    }\n}\n\n`;
        }
    }

    return result;
}

function generateDockerCompose(
    services: ServiceInfo[],
    config: ClusterConfig,
): string {
    const result: string[] = [];
    result.push(`services:`);

    // auth
    result.push(`  auth:`);
    result.push(`    build: ./auth`);
    result.push(`    container_name: kadmium-auth`);
    result.push(`    restart: unless-stopped`);
    result.push(`    ports: ["4000:4000"]`);
    result.push(`    environment:`);
    result.push(`      - NODE_ENV=production`);
    result.push(`      - PORT=4000`);
    result.push(`      - JWT_SECRET=\${JWT_SECRET:-default-jwt-secret}`);
    result.push(`      - CLUSTER_KEY=\${CLUSTER_KEY:-default-cluster-key}`);
    result.push(`      - ADMIN_PASSWORD=\${ADMIN_PASSWORD:-admin123}`);
    result.push(`      - DATABASE_URL=/kadmium/auth/data/auth.db`);
    result.push(`    volumes:`);
    result.push(`      - auth-data:/kadmium/auth/data`);
    if (config.ssl !== 'none') {
        result.push(`      - ./auth/keys:/keys:ro`);
    }
    result.push(`    networks: [kadmium]\n`);

    const svcProtocol = config.ssl !== 'none' ? 'https' : 'http';

    // services
    for (const svc of services) {
        result.push(`  ${svc.name}:`);
        result.push(`    build: ./services/${svc.name}/server`);
        result.push(`    container_name: kadmium-${svc.name}`);
        result.push(`    restart: unless-stopped`);
        result.push(`    ports: ["${svc.port}:${svc.port}"]`);
        result.push(`    environment:`);
        result.push(`      - NODE_ENV=production`);
        result.push(`      - AUTH_SERVICE_URL=${config.authInternalUrl}`);
        result.push(
            `      - CALLBACK_URL=${svcProtocol}://${svc.name}.${config.domain}/`,
        );
        result.push(`      - CLUSTER_KEY=\${CLUSTER_KEY:-default-cluster-key}`);
        result.push(`      - NODE_TLS_REJECT_UNAUTHORIZED=0`);
        result.push(`    depends_on:`);
        result.push(`      auth: { condition: service_started }`);
        result.push(`    networks: [kadmium]\n`);

        if (svc.hasWeb) {
            result.push(`  ${svc.name}-web:`);
            result.push(`    build: ./services/${svc.name}/web`);
            result.push(`    container_name: kadmium-${svc.name}-web`);
            result.push(`    restart: unless-stopped`);
            result.push(`    ports: ["${svc.webPort}:${svc.webPort}"]`);
            result.push(`    environment:`);
            result.push(`      - PORT=${svc.webPort}`);
            result.push(`    networks: [kadmium]\n`);
        }
    }

    // nginx
    result.push(`  nginx:`);
    result.push(`    image: nginx:alpine`);
    result.push(`    container_name: kadmium-nginx`);
    result.push(`    restart: unless-stopped`);
    result.push(`    ports: ["443:443", "80:80"]`);
    result.push(`    volumes:`);
    result.push(
        `      - ./nginx/kadmium.conf:/etc/nginx/conf.d/kadmium.conf:ro`,
    );
    if (config.ssl !== 'none') {
        result.push(`      - ./auth/keys:/etc/nginx/keys:ro`);
    }
    result.push(`    depends_on:`);
    result.push(`      - auth`);
    for (const svc of services) {
        result.push(`      - ${svc.name}`);
        if (svc.hasWeb) result.push(`      - ${svc.name}-web`);
    }
    result.push(`    networks: [kadmium]\n`);

    // dns
    if (config.dns) {
        result.push(`  dns:`);
        result.push(`    image: strm/dnsmasq`);
        result.push(`    container_name: kadmium-dns`);
        result.push(`    restart: unless-stopped`);
        result.push(`    profiles: [dns]`);
        result.push(`    ports: ["53:53/udp"]`);
        result.push(`    cap_add: [NET_ADMIN]`);
        result.push(`    environment:`);
        result.push(`      - DNS1=8.8.8.8`);
        result.push(`      - DNS2=1.1.1.1`);
        result.push(`    volumes:`);
        result.push(`      - ./dns/dnsmasq.conf:/etc/dnsmasq.conf`);
        result.push(`    networks: [kadmium]\n`);
    }

    result.push(`networks:`);
    result.push(`  kadmium:`);
    result.push(`    name: kadmium-network\n`);

    result.push(`volumes:`);
    result.push(`  auth-data:`);

    return result.join('\n');
}

function generateEnv(services: ServiceInfo[], config: ClusterConfig): string {
    const lines: string[] = [];
    lines.push(`# Kadmium Cluster — ${config.domain}`);
    lines.push(`DOMAIN=${config.domain}`);
    lines.push(`IP=${config.ip}`);
    lines.push(`SSL=${config.ssl}`);
    lines.push(`DNS=${config.dns}`);
    lines.push(`WEB_TYPE=${config.webType}`);
    lines.push(``);
    lines.push(`# Auth URLs`);
    lines.push(`AUTH_EXTERNAL_URL=${config.authExternalUrl}`);
    lines.push(`AUTH_INTERNAL_URL=${config.authInternalUrl}`);
    lines.push(``);
    lines.push(`# Auth`);
    lines.push(`JWT_SECRET=${crypto.randomUUID()}`);
    lines.push(`CLUSTER_KEY=${crypto.randomUUID()}`);
    lines.push(`ADMIN_PASSWORD=admin123`);
    lines.push(``);
    lines.push(`# Services`);
    for (const svc of services) {
        lines.push(`${svc.name.toUpperCase()}_PORT=${svc.port}`);
        if (svc.hasWeb) {
            lines.push(`${svc.name.toUpperCase()}_WEB_PORT=${svc.webPort}`);
        }
    }
    lines.push(``);
    return lines.join('\n');
}

function generateDnsmasqConfig(
    services: ServiceInfo[],
    config: ClusterConfig,
): string {
    const lines: string[] = [];
    const authHost = new URL(config.authExternalUrl).hostname;
    lines.push(`address=/${authHost}/${config.ip}`);
    for (const svc of services) {
        lines.push(`address=/${svc.name}.${config.domain}/${config.ip}`);
        if (svc.hasWeb) {
            lines.push(
                `address=/${svc.name}-web.${config.domain}/${config.ip}`,
            );
        }
    }
    lines.push(``);
    lines.push(`bind-interfaces`);
    lines.push(`listen-address=0.0.0.0`);
    lines.push(`no-resolv`);
    return lines.join('\n');
}

// ─── Основная функция ──────────────────────────────────────────────────────

export async function run(args: string[]): Promise<void> {
    const ctx = detectContext(process.cwd());
    requireClusterRoot(ctx, 'cluster:config');

    const clusterPath = ctx.path;
    const config = readClusterConfig(clusterPath);
    const services = scanServices(clusterPath);

    const flags = {
        check: args.includes('--check'),
        force: args.includes('--force'),
    };

    logger.info(`${services.length} сервисов найдено`);

    // Создаём необходимые папки
    const dirs = ['nginx', 'dns'];
    for (const dir of dirs) {
        const dirPath = join(clusterPath, dir);
        if (!existsSync(dirPath)) {
            mkdirSync(dirPath, { recursive: true });
        }
    }

    // Генерация файлов
    const files: Record<string, string> = {
        'nginx/kadmium.conf': generateNginxConfig(services, config),
        'docker-compose.yml': generateDockerCompose(services, config),
        '.env': generateEnv(services, config),
    };

    if (config.dns) {
        files['dns/dnsmasq.conf'] = generateDnsmasqConfig(services, config);
    }

    if (flags.check) {
        // Режим проверки — только показываем diff
        logger.separator('Config Preview');
        for (const [file, content] of Object.entries(files)) {
            const filePath = join(clusterPath, file);
            const exists = existsSync(filePath);
            logger.info(`${exists ? '📝' : '➕'} ${file}`);
            if (process.env.DEBUG) {
                console.log(
                    content.substring(0, 300) +
                        (content.length > 300 ? '...' : ''),
                );
            }
        }
        logger.separator();
        logger.success(
            `Будет сгенерировано ${Object.keys(files).length} файлов`,
        );
        return;
    }

    // Запись файлов
    let written = 0;
    for (const [file, content] of Object.entries(files)) {
        const filePath = join(clusterPath, file);
        writeFileSync(filePath, content, 'utf-8');
        logger.success(`${file}`);
        written++;
    }

    // ── kadmium.json ──
    const devAuthUrl = `http://localhost:${4000}`;
    const devCallbackUrl = `http://localhost:${services.length > 0 ? services[0].webPort || 5173 : 5173}/`;
    const meta: KadmiumMeta = {
        version: 1,
        domain: config.domain,
        ip: config.ip,
        ssl: config.ssl,
        webType: config.webType,
        auth: {
            path: './auth',
            port: 4000,
            externalUrl: config.authExternalUrl,
            internalUrl: config.authInternalUrl,
        },
        dev: {
            authUrl: devAuthUrl,
            callbackUrl: devCallbackUrl,
        },
        services: services.map((svc) => ({
            name: svc.name,
            api: { path: `./services/${svc.name}/server`, port: svc.port },
            ...(svc.hasWeb
                ? {
                      web: {
                          path: `./services/${svc.name}/web`,
                          port: svc.webPort,
                      },
                  }
                : {}),
        })),
    };
    writeMeta(clusterPath, meta);
    logger.success('kadmium.json');
    written++;

    // ── .env и vite.config для веб-сервисов ──
    const svcProtocol = config.ssl !== 'none' ? 'https' : 'http';
    for (const svc of services) {
        if (!svc.hasWeb) continue;

        const webPath = join(clusterPath, `./services/${svc.name}/web`);

        // .env
        const envPath = join(webPath, '.env');
        let existingLines: string[] = [];
        try {
            const existing = readFileSync(envPath, 'utf-8');
            existingLines = existing.split('\n').filter((l) => l.trim());
        } catch {
            /* file doesn't exist yet */
        }

        const envMap: Record<string, string> = {};
        for (const line of existingLines) {
            const eqIdx = line.indexOf('=');
            if (eqIdx > 0) {
                envMap[line.slice(0, eqIdx)] = line.slice(eqIdx + 1);
            }
        }
        envMap['PUBLIC_IS_PRODUCTION'] = 'false';
        envMap['PUBLIC_AUTH_URL'] = config.authExternalUrl;
        envMap['PUBLIC_API_URL'] =
            `${svcProtocol}://${svc.name}.${config.domain}/`;
        envMap['PUBLIC_DEV_AUTH_URL'] = devAuthUrl;
        envMap['PUBLIC_DEV_API_URL'] = `http://localhost:${svc.port}`;
        envMap['PUBLIC_DEV_CALLBACK_URL'] = devCallbackUrl;

        const newContent =
            Object.entries(envMap)
                .map(([k, v]) => `${k}=${v}`)
                .join('\n') + '\n';
        writeFileSync(envPath, newContent, 'utf-8');
        logger.success(`services/${svc.name}/web/.env`);
        written++;

        // vite.config.ts
        const viteConfig = `import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [sveltekit()],
    server: {
        proxy: {
            '/auth-proxy': {
                target: '${devAuthUrl}',
                changeOrigin: true,
                rewrite: (path) => path.replace('/auth-proxy', ''),
                headers: { 'x-forwarded-proto': 'http' }
            },
            '/api-proxy': {
                target: 'http://localhost:${svc.port}',
                changeOrigin: true,
                rewrite: (path) => path.replace('/api-proxy', ''),
                headers: { 'x-forwarded-proto': 'http' }
            }
        }
    }
});
`;
        writeFileSync(join(webPath, 'vite.config.ts'), viteConfig, 'utf-8');
        logger.success(`services/${svc.name}/web/vite.config.ts`);
        written++;
    }

    // ── auth/vite.config.ts — добавить localhost в allowedHosts ──
    const authVitePath = join(clusterPath, 'auth', 'vite.config.ts');
    if (existsSync(authVitePath)) {
        let authVite = readFileSync(authVitePath, 'utf-8');
        if (
            !authVite.includes('"localhost"') &&
            !authVite.includes("'localhost'")
        ) {
            // Add localhost to allowedHosts array
            authVite = authVite.replace(
                /allowedHosts:\s*\[([^\]]+)\]/,
                (match, hosts) => `allowedHosts: [${hosts}, "localhost"]`,
            );
            writeFileSync(authVitePath, authVite, 'utf-8');
            logger.success(
                'auth/vite.config.ts (добавлен localhost в allowedHosts)',
            );
            written++;
        }
    }

    // ── kadmium.config.ts для API сервисов ──
    let clusterKey = 'default-cluster-key';
    try {
        const envRaw = readFileSync(join(clusterPath, '.env'), 'utf-8');
        const match = envRaw.match(/^CLUSTER_KEY=(.+)$/m);
        if (match) clusterKey = match[1];
    } catch {}
    for (const svc of services) {
        const configPath = join(
            clusterPath,
            `./services/${svc.name}/server/src/kadmium.config.ts`,
        );
        if (!existsSync(configPath)) continue;

        const template = readTemplate('server/kadmium.config.ts.hbs');
        const content = renderTemplate(template, {
            authExternalUrl: config.authExternalUrl,
            appId: svc.name,
            protocol: svcProtocol,
            domain: config.domain,
            clusterKey,
        });
        writeFileSync(configPath, content, 'utf-8');
        logger.success(`services/${svc.name}/server/src/kadmium.config.ts`);
        written++;
    }

    logger.blank();
    logger.separator('Готово');
    logger.success(`Сгенерировано ${written} файлов`);
    if (services.length > 0) {
        logger.blank();
        logger.info(`Запустите: docker compose up -d --build`);
    }
}
