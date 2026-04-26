import { IntegrationTestCase } from '../types/IntegrationTestCase';
import { KadmiumApp } from '../../src/kadmium-app';
import { Post } from '../../src/models/schemas/Post';
import { User } from '../../src/models/schemas/User';

export class TC7_Subquery extends IntegrationTestCase {
    constructor(app: KadmiumApp) {
        super(app, 'Subquery in WHERE...IN');
    }

    protected async runImpl(): Promise<void> {
        const userRepo = this.app.Repo.get(User);
        const postRepo = this.app.Repo.get(Post);

        const adminIdsQuery = userRepo
            .where((u) => u.last_name.eq('Admin'))
            .select((u, {}) => [u.id]);

        const postsFromAdmins = await postRepo
            .where((p) => p.author_id.in(adminIdsQuery))
            .select((p, { count }) => [
                p.title,
                count(p.title).as('post_count'),
            ])
            .go();
        postsFromAdmins?.[0].post_count;
        postsFromAdmins?.[0].title;

        if (postsFromAdmins.length !== 3) {
            throw new Error(
                `Expected 3 posts from admins, but got ${postsFromAdmins.length}.`,
            );
        }

        const adminPostTitles = postsFromAdmins.map((p: any) => p.title).sort();
        const expectedAdminPostTitles = [
            "Alice's Private Draft",
            "Alice's Public Post",
            "Charlie's Draft",
        ].sort();

        if (
            JSON.stringify(adminPostTitles) !==
            JSON.stringify(expectedAdminPostTitles)
        ) {
            throw new Error('Fetched incorrect posts from admins.');
        }
    }
}
