import { IntegrationTestCase } from '../types/IntegrationTestCase';
import { KadmiumApp } from '../../src/kadmium-app';
import { Post } from '../../src/models/schemas/Post';
import { User } from '../../src/models/schemas/User';

export class TC2_ComplexGroups extends IntegrationTestCase {
    constructor(app: KadmiumApp) {
        super(app, 'Complex nested groups (Multi-Repo)');
    }

    protected async runImpl(): Promise<void> {
        const complexQuery = await this.app.Repo.query({ u: User, p: Post })
            .join({
                left: 'p',
                right: 'u',
                on: (t) => t.p.author_id.eq(t.u.id),
            })
            .group((q) => {
                q.group((g1) =>
                    g1
                        .where((t) => t.u.first_name.eq('Alice'))
                        .and((t) => t.p.is_published.eq(true)),
                ).or((t) => t.u.first_name.eq('Bob'));
            })
            .select((t) => [t.p.title])
            .go();

        if (complexQuery.length !== 2) {
            throw new Error(`Expected 2 posts, but got ${complexQuery.length}`);
        }

        const titles = complexQuery.map((row: any) => row.p.title).sort();
        if (
            titles[0] !== "Alice's Public Post" ||
            titles[1] !== "Bob's News (Published)"
        ) {
            throw new Error('Fetched incorrect posts.');
        }
    }
}
