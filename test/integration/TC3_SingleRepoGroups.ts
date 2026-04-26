import { IntegrationTestCase } from '../types/IntegrationTestCase';
import { KadmiumApp } from '../../src/kadmium-app';
import { User } from '../../src/models/schemas/User';

export class TC3_SingleRepoGroups extends IntegrationTestCase {
    constructor(app: KadmiumApp) {
        super(app, 'Complex groups on a single repository');
    }

    protected async runImpl(): Promise<void> {
        const userRepo = this.app.Repo.get(User);

        const specificUsers = await userRepo
            .where([
                (q) => {
                    q.where([
                        (g1) => {
                            g1.where((u) => u.first_name.eq('Alice')).and((u) =>
                                u.last_name.eq('Admin'),
                            );
                        },
                    ]).or([
                        (g2) => {
                            g2.where((u) => u.first_name.eq('Bob')).and((u) =>
                                u.last_name.eq('Editor'),
                            );
                        },
                    ]);
                },
            ])
            .select()
            .go();

        if (specificUsers.length !== 2) {
            throw new Error(
                `Expected 2 users, but got ${specificUsers.length}`,
            );
        }
    }
}
