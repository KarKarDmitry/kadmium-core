#!/usr/bin/env node

// CJS entry point for kadmium CLI
// Imports the ESM module and calls its run() function
const { createRequire } = require('module');
const req = createRequire(__filename);

async function main() {
    try {
        // Import the ESM CLI module (compiled to dist/cli/index.js)
        const mod = await req('./dist/cli/index.js');

        // Pass all CLI args (skip node and script path)
        const args = process.argv.slice(2);

        if (args.length === 0) {
            console.log('Kadmium CLI');
            console.log('Run: kadmium help');
            return;
        }

        if (typeof mod.run === 'function') {
            await mod.run(args);
        } else {
            console.error('Internal error: CLI module does not export run()');
            process.exit(1);
        }
    } catch (err) {
        console.error('=== KADMIUM CLI ERROR ===');
        console.error('Message:', err.message || err);
        if (err.stack) {
            const lines = err.stack.split('\n');
            console.error(lines.slice(0, 6).join('\n'));
        }
        if (err.code) console.error('Code:', err.code);
        console.error('=========================');
        process.exit(1);
    }
}

main();
