#!/usr/bin/env node

// ESM entry point for kadmium CLI
// Using .mjs extension ensures Node.js treats this as ES Module
// regardless of the package.json "type" field

async function main() {
    try {
        // Import the ESM CLI module
        const mod = await import('../dist/cli/index.js');

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
        console.error('Kadmium CLI Error:', err.message || err);
        process.exit(1);
    }
}

main();
