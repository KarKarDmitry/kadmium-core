import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';

export interface KadmiumMeta {
    version: 1;
    domain: string;
    ip: string;
    ssl: 'mkcert' | 'self' | 'none';
    webType: 'svelte' | 'empty' | 'none';
    auth: {
        path: string;
        port: number;
        externalUrl: string;
        internalUrl: string;
    };
    dev: {
        authUrl: string;
        callbackUrl: string;
    };
    services: Array<{
        name: string;
        api: { path: string; port: number };
        web?: { path: string; port: number };
    }>;
}

const META_FILENAME = 'kadmium.json';

export function readMeta(clusterPath: string): KadmiumMeta | null {
    const metaPath = join(clusterPath, META_FILENAME);
    if (!existsSync(metaPath)) return null;
    try {
        return JSON.parse(readFileSync(metaPath, 'utf-8'));
    } catch {
        return null;
    }
}

export function writeMeta(clusterPath: string, meta: KadmiumMeta): void {
    const metaPath = join(clusterPath, META_FILENAME);
    writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
}
