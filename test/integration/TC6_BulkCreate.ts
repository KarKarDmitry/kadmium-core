import { IntegrationTestCase } from '../types/IntegrationTestCase';
import { KadmiumApp } from '../../src/kadmium-app';
import { User } from '../../src/models/schemas/User';

export class TC6_BulkCreate extends IntegrationTestCase {
    constructor(app: KadmiumApp) {
        super(app, 'Bulk Create');
    }

    protected async runImpl(): Promise<void> {
        const userRepo = this.app.Repo.get(User);
        const bulkUsersData = [
            {
                first_name: 'Eve',
                last_name: 'Bulk',
                email: `eve.${Date.now()}@example.com`,
                username: `eve${Date.now()}`,
                password: 'a-secure-password',
                confirm_password: 'a-secure-password',
            },
            {
                first_name: 'Frank',
                last_name: 'Bulk',
                email: `frank.${Date.now()}@example.com`,
                username: `frank${Date.now()}`,
                password: 'a-secure-password',
                confirm_password: 'a-secure-password',
            },
        ];
        const createdUsers = (await userRepo
            .create(bulkUsersData)
            .go()) as User[];

        if (!Array.isArray(createdUsers) || createdUsers.length !== 2) {
            throw new Error(
                `Expected to create 2 users, but got ${
                    Array.isArray(createdUsers)
                        ? createdUsers.length
                        : 'not an array'
                }.`,
            );
        }

        if (
            createdUsers[0].first_name !== 'Eve' ||
            createdUsers[1].first_name !== 'Frank'
        ) {
            throw new Error('Bulk created users have incorrect data.');
        }

        // We need to add these users to the cleanup list in the runner
    }
}
