import { IntegrationTestCase } from '../types/IntegrationTestCase';
import { KadmiumApp } from '../../src/kadmium-app';
import { Comment } from '../../src/models/schemas/Comment';
import { Post } from '../../src/models/schemas/Post';
import { User } from '../../src/models/schemas/User';

export class TC10_TriangleJoin extends IntegrationTestCase {
    constructor(app: KadmiumApp) {
        super(app, 'Triangle Join - Find comments by post author');
    }

    protected async runImpl(): Promise<void> {
        const selfComments = await this.app.Repo.query({
            c: Comment,
            p: Post,
            u: User,
        })
            .join({ left: 'c', right: 'p', on: (t) => t.c.post_id.eq(t.p.id) })
            .join({ left: 'c', right: 'u', on: (t) => t.c.user_id.eq(t.u.id) })
            .where((t) => t.p.author_id.eq(t.u.id)) // This join connects p and u
            .select((t) => [t.c.body])
            .go();

        if (
            selfComments.length !== 1 ||
            (selfComments[0] as any).c.body !== 'Self-comment'
        ) {
            throw new Error(
                `Expected 1 self-comment, but got ${JSON.stringify(selfComments)}`,
            );
        }
    }
}
