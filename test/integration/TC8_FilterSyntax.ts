import { IntegrationTestCase } from '../types/IntegrationTestCase';
import { KadmiumApp } from '../../src/kadmium-app';
import { User } from '../../src/models/schemas/User';

export class TC8_FilterSyntax extends IntegrationTestCase {
    constructor(app: KadmiumApp) {
        super(app, 'Refactored Filter Syntax');
    }

    protected async runImpl(): Promise<void> {
        const userRepo = this.app.Repo.get(User);

        const aliceOnly = await userRepo
            .where((u) => u.first_name.start('Alic'))
            .and((u) => u.last_name.ilike('dmin'))
            .select((u, {}) => [u.first_name])
            .go();

        if (
            aliceOnly.length !== 1 ||
            (aliceOnly[0] as any).first_name !== 'Alice'
        ) {
            throw new Error(
                `Expected to find only Alice, but found ${JSON.stringify(aliceOnly)}.`,
            );
        }
    }
}
