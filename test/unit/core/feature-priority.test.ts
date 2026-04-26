import { UnitTest } from '../../types/UnitTest';

interface FeatureMock {
    priority: number;
    name: string;
}

function sortByPriority(features: FeatureMock[]): FeatureMock[] {
    return [...features].sort((a, b) => a.priority - b.priority);
}

export class FeaturePriorityTest extends UnitTest {
    constructor() {
        super('Feature priority sorting');
    }

    protected async runImpl(): Promise<void> {
        this.test_defaultPriority();
        this.test_explicitPriority();
        this.test_unorderedInput();
    }

    private test_defaultPriority(): void {
        const features: FeatureMock[] = [
            { priority: 0, name: 'A' },
            { priority: 0, name: 'B' },
        ];
        const sorted = sortByPriority(features);
        if (sorted.length !== 2) throw new Error('Expected 2 features');
        if (sorted[0].name !== 'A')
            throw new Error('Same priority should preserve order');
    }

    private test_explicitPriority(): void {
        const features: FeatureMock[] = [
            { priority: 0, name: 'Audit' },
            { priority: -100, name: 'SoftDelete' },
            { priority: 100, name: 'Revisions' },
        ];
        const sorted = sortByPriority(features);
        if (sorted[0].name !== 'SoftDelete')
            throw new Error('SoftDelete should be first');
        if (sorted[1].name !== 'Audit')
            throw new Error('Audit should be second');
        if (sorted[2].name !== 'Revisions')
            throw new Error('Revisions should be last');
    }

    private test_unorderedInput(): void {
        const features: FeatureMock[] = [
            { priority: 100, name: 'Revisions' },
            { priority: -100, name: 'SoftDelete' },
            { priority: 0, name: 'Audit' },
        ];
        const sorted = sortByPriority(features);
        if (sorted[0].priority !== -100)
            throw new Error('First should be -100');
        if (sorted[1].priority !== 0) throw new Error('Second should be 0');
        if (sorted[2].priority !== 100) throw new Error('Third should be 100');
    }
}
