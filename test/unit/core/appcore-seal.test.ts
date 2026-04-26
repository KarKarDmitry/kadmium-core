import { UnitTest } from '../../types/UnitTest';
import { AppCore } from '../../../src/core/app-core';

export class AppCoreSealTest extends UnitTest {
    constructor() {
        super('AppCore seal() prevents reconfiguration');
    }

    protected async runImpl(): Promise<void> {
        this.test_configureBeforeSeal();
        this.test_configureAfterSeal();
        this.test_isSealedFlag();
    }

    private test_configureBeforeSeal(): void {
        const app = new AppCore();
        // Should not throw before seal
        app.configure({ app: { port: 4000 } });
        if (app.app.port !== 4000)
            throw new Error('Port should be updated before seal');
    }

    private test_configureAfterSeal(): void {
        const app = new AppCore();
        app.seal();

        try {
            app.configure({ app: { port: 5000 } });
            throw new Error('Should have thrown after seal');
        } catch (e: any) {
            if (e.message === 'Should have thrown after seal') throw e;
            if (!e.message.includes('sealed'))
                throw new Error("Expected 'sealed' error, got: " + e.message);
        }
    }

    private test_isSealedFlag(): void {
        const app = new AppCore();
        if (app.isSealed) throw new Error('Should not be sealed initially');

        app.seal();
        if (!app.isSealed) throw new Error('Should be sealed after seal()');
    }
}
