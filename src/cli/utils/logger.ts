// Simple logger without dependencies
// Uses plain console + emojis — no chalk required

export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug';

class Logger {
    private prefix: string;

    constructor(prefix?: string) {
        this.prefix = prefix ? `[${prefix}] ` : '';
    }

    private log(level: LogLevel, emoji: string, message: string): void {
        const timestamp = new Date().toLocaleTimeString('ru-RU', {
            hour12: false,
        });

        switch (level) {
            case 'info':
                console.log(`${timestamp} ${this.prefix}ℹ ${emoji} ${message}`);
                break;
            case 'success':
                console.log(`${timestamp} ${this.prefix}✔ ${emoji} ${message}`);
                break;
            case 'warn':
                console.warn(
                    `${timestamp} ${this.prefix}⚠ ${emoji} ${message}`,
                );
                break;
            case 'error':
                console.error(
                    `${timestamp} ${this.prefix}✘ ${emoji} ${message}`,
                );
                break;
            case 'debug':
                if (process.env.DEBUG) {
                    console.log(
                        `${timestamp} ${this.prefix}▸ ${emoji} ${message}`,
                    );
                }
                break;
        }
    }

    info(message: string): void {
        this.log('info', '', message);
    }

    success(message: string): void {
        this.log('success', '', message);
    }

    warn(message: string): void {
        this.log('warn', '', message);
    }

    error(message: string): void {
        this.log('error', '', message);
    }

    debug(message: string): void {
        this.log('debug', '', message);
    }

    blank(): void {
        console.log('');
    }

    separator(title?: string): void {
        const width = 60;
        if (title) {
            const padded = ` ${title} `
                .padStart((width + title.length) / 2, '═')
                .padEnd(width, '═');
            console.log(padded);
        } else {
            console.log('═'.repeat(width));
        }
    }

    table(rows: Record<string, string>): void {
        const keys = Object.keys(rows);
        const maxKeyLen = Math.max(...keys.map((k) => k.length));
        for (const [key, value] of Object.entries(rows)) {
            console.log(`  ${key.padEnd(maxKeyLen)}  ${value}`);
        }
    }
}

export const logger = new Logger();
export function createLogger(prefix: string): Logger {
    return new Logger(prefix);
}
