import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';

// Define the structure for a single data point
type ProfileDataPoint = {
    filePath: string;
    className: string;
    methodName: string;
    executionTime: number; // in ms
};

type ProfileResult = {
    File: string;
    Method: string;
    'Total Calls': number;
    'Avg (ms)': number;
    'Min (ms)': number;
    'Max (ms)': number;
    'Total (ms)': number;
};

const PROFILE_OUTPUT_FILE = path.join(process.cwd(), 'profiler.results.json');

// The main profiler class
export class Profiler {
    private static isEnabled = false;
    private static records: ProfileDataPoint[] = [];

    /**
     * Enables or disables the profiler.
     */
    public static enable(state = true) {
        Profiler.isEnabled = state;
        console.log(
            `[Profiler] Collection is now ${
                Profiler.isEnabled ? 'ENABLED' : 'DISABLED'
            }.`,
        );
    }

    /**
     * A method decorator factory that measures the execution time of an async method.
     * @param filePath The path of the file containing the decorated method.
     */
    public static Profile(filePath: string) {
        return function (
            target: any,
            propertyKey: string,
            descriptor: PropertyDescriptor,
        ) {
            const originalMethod = descriptor.value;

            if (typeof originalMethod !== 'function') {
                return descriptor;
            }

            // Async method
            if (originalMethod.constructor.name === 'AsyncFunction') {
                descriptor.value = async function (...args: any[]) {
                    if (!Profiler.isEnabled) {
                        return originalMethod.apply(this, args);
                    }

                    const start = process.hrtime.bigint();
                    try {
                        return await originalMethod.apply(this, args);
                    } finally {
                        const end = process.hrtime.bigint();
                        const executionTime = Number(end - start) / 1e6; // ns to ms

                        Profiler.records.push({
                            filePath,
                            className: target.constructor.name,
                            methodName: propertyKey,
                            executionTime: executionTime,
                        });
                    }
                };
            } else {
                // Sync method
                descriptor.value = function (...args: any[]) {
                    if (!Profiler.isEnabled) {
                        return originalMethod.apply(this, args);
                    }

                    const start = process.hrtime.bigint();
                    const result = originalMethod.apply(this, args);
                    const end = process.hrtime.bigint();
                    const executionTime = Number(end - start) / 1e6; // ns to ms

                    Profiler.records.push({
                        filePath,
                        className: target.constructor.name,
                        methodName: propertyKey,
                        executionTime: executionTime,
                    });

                    return result;
                };
            }

            return descriptor;
        };
    }
    /**
     * Calculates statistics, compares with previous runs, and saves the new results.
     */
    public static results() {
        if (Profiler.records.length === 0) {
            console.log('[Profiler] No profiling data was collected.');
            return;
        }

        // --- 1. Get previous results ---
        let previousResults: ProfileResult[] = [];
        try {
            if (fs.existsSync(PROFILE_OUTPUT_FILE)) {
                const fileContent = fs.readFileSync(
                    PROFILE_OUTPUT_FILE,
                    'utf-8',
                );
                if (fileContent) {
                    previousResults = JSON.parse(fileContent);
                }
            }
        } catch (e) {
            console.warn(
                '[Profiler] Could not read or parse previous results file.',
                e,
            );
        }

        // --- 2. Calculate current results ---
        const grouped = Profiler.records.reduce(
            (acc, record) => {
                const key = `${record.filePath} -> ${record.className}.${record.methodName}`;
                if (!acc[key]) {
                    acc[key] = {
                        file: record.filePath.replace(process.cwd(), '.'), // Make path relative
                        method: `${record.className}.${record.methodName}`,
                        timings: [],
                    };
                }
                acc[key].timings.push(record.executionTime);
                return acc;
            },
            {} as Record<
                string,
                { file: string; method: string; timings: number[] }
            >,
        );

        const currentResults: ProfileResult[] = Object.values(grouped).map(
            (group) => {
                const sum = group.timings.reduce((a, b) => a + b, 0);
                return {
                    File: group.file,
                    Method: group.method,
                    'Total Calls': group.timings.length,
                    'Avg (ms)': parseFloat(
                        (sum / group.timings.length).toFixed(4),
                    ),
                    'Min (ms)': parseFloat(
                        Math.min(...group.timings).toFixed(4),
                    ),
                    'Max (ms)': parseFloat(
                        Math.max(...group.timings).toFixed(4),
                    ),
                    'Total (ms)': parseFloat(sum.toFixed(4)),
                };
            },
        );

        // --- 3. Compare and display ---
        const colorizeDiff = (diffP: number): string => {
            const text = `${diffP > 0 ? '+' : ''}${diffP.toFixed(2)}%`;
            // Improvement (Green)
            if (diffP < -0.5) {
                const mag = Math.abs(diffP);
                if (mag >= 15) return chalk.green.bold(text);
                if (mag >= 5) return chalk.green(text);
                return chalk.greenBright(text); // Weakest green for minor improvements
            }
            // Regression (Red)
            if (diffP > 5) {
                // Changed from 0.5 to 5
                const mag = diffP;
                if (mag >= 15) return chalk.bgRed.white.bold(text);
                return chalk.red(text);
            }
            // Insignificant or minor regression
            return chalk.yellow(text);
        };

        console.log('\n\n--- PROFILING RESULTS ---');
        currentResults.sort((a, b) => b['Total (ms)'] - a['Total (ms)']);

        if (previousResults.length > 0) {
            const prevAvgMap = new Map(
                previousResults.map((r) => [r.Method, r['Avg (ms)']]),
            );
            const headers = [
                'Method',
                'Total Calls',
                'Avg (ms)',
                'Prev Avg (ms)',
                'Diff (%)',
                'Total (ms)',
            ];
            const table = new Table({
                head: headers.map((h) => chalk.cyan(h)),
                colAligns: ['left', 'left', 'right', 'right', 'right', 'right'],
            });

            currentResults.forEach((currentRow) => {
                const prevAvg = prevAvgMap.get(currentRow.Method);
                let diffText = 'N/A';

                if (prevAvg !== undefined && prevAvg > 0) {
                    const diffMs = currentRow['Avg (ms)'] - prevAvg;
                    const diffP = (diffMs / prevAvg) * 100;
                    diffText = colorizeDiff(diffP);
                }

                table.push([
                    currentRow.Method,
                    currentRow['Total Calls'],
                    currentRow['Avg (ms)'],
                    prevAvg ?? 'N/A',
                    diffText,
                    currentRow['Total (ms)'],
                ]);
            });
            console.log(table.toString());
        } else {
            const headers = ['Method', 'Total Calls', 'Avg (ms)', 'Total (ms)'];
            const table = new Table({
                head: headers.map((h) => chalk.cyan(h)),
                colAligns: ['left', 'left', 'right', 'right'],
            });
            currentResults.forEach((row) => {
                table.push([
                    row.Method,
                    row['Total Calls'],
                    row['Avg (ms)'],
                    row['Total (ms)'],
                ]);
            });
            console.log(table.toString());
        }

        // --- 4. Save current results for next time ---
        try {
            fs.writeFileSync(
                PROFILE_OUTPUT_FILE,
                JSON.stringify(currentResults, null, 2),
            );
            console.log(`[Profiler] Results saved to ${PROFILE_OUTPUT_FILE}`);
        } catch (e) {
            console.error('[Profiler] Failed to save results file.', e);
        }

        // --- 5. Clear records for the next potential run ---
        Profiler.records = [];
    }
}
