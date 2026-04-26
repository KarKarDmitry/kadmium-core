import { IntegrationTestCase } from '../types/IntegrationTestCase';
import { KadmiumApp } from '../../src/kadmium-app';
import { User } from '../../src/models/schemas/User';

export class TC12_RawQuery extends IntegrationTestCase {
    constructor(app: KadmiumApp) {
        super(app, 'Raw SQL Query');
    }

    protected async runImpl(): Promise<void> {
        const users = await this.app.Repo.get(User)
            .select((u) => [u.id, u.first_name])
            .go();
        const firstUserId = users[0].id;

        const rawUsers = await this.app.Repo.raw(
            'SELECT id, first_name FROM "user" WHERE id = $1',
            [firstUserId],
        ).go<User>();

        if (rawUsers.length !== 1) {
            throw new Error(
                `Expected 1 user from raw query, but got ${rawUsers.length}`,
            );
        }

        const user = rawUsers[0];
        if (user.id !== firstUserId || user.first_name !== 'Alice') {
            throw new Error(
                `Raw query returned incorrect user data: ${JSON.stringify(user)}`,
            );
        }
    }
}
