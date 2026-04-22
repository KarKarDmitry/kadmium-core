export declare class Profiler {
    private static isEnabled;
    private static records;
    /**
     * Enables or disables the profiler.
     */
    static enable(state?: boolean): void;
    /**
     * A method decorator factory that measures the execution time of an async method.
     * @param filePath The path of the file containing the decorated method.
     */
    static Profile(filePath: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
    /**
     * Calculates statistics, compares with previous runs, and saves the new results.
     */
    static results(): void;
}
//# sourceMappingURL=profiler.d.ts.map