import { IntegrationTestCase } from '../types/IntegrationTestCase';
import { KadmiumApp } from '../../src/kadmium-app';
import { User } from '../../src/models/schemas/User';
import { Department } from '../../src/models/schemas/Department';
import { Post } from '../../src/models/schemas/Post';
import { Comment } from '../../src/models/schemas/Comment';

export class TC14_Include extends IntegrationTestCase {
    constructor(app: KadmiumApp) {
        super(app, 'Include (Relations)');
    }

    protected async runImpl(): Promise<void> {
        const userRepo = this.app.Repo.get(User);
        const departmentRepo = this.app.Repo.get(Department);
        const postRepo = this.app.Repo.get(Post);
        const commentRepo = this.app.Repo.get(Comment);

        // 1. --- SETUP ---
        console.log('   - Setting up data for Include tests...');
        const testDept = await departmentRepo
            .create({ name: 'Include Test Dept' })
            .go();
        const testUser = await userRepo
            .create({
                first_name: 'Include',
                last_name: 'User',
                email: `include.user.${Date.now()}@example.com`,
                username: `include_user_${Date.now()}`,
                department_id: testDept.id,
                password: 'a-secure-password',
            })
            .go();
        const testPost1 = await postRepo
            .create({
                title: 'Include Post 1 (Published)',
                author_id: testUser.id,
                is_published: true,
            })
            .go();
        const testPost2 = await postRepo
            .create({
                title: 'Include Post 2 (Draft)',
                author_id: testUser.id,
                is_published: false,
            })
            .go();
        const testComment1 = await commentRepo
            .create({
                body: 'Comment on Post 1',
                user_id: testUser.id,
                post_id: testPost1.id,
            })
            .go();
        const testComment2 = await commentRepo
            .create({
                body: 'Another comment on Post 1',
                user_id: testUser.id,
                post_id: testPost1.id,
            })
            .go();
        console.log('     - Setup complete.');

        // 2. --- Test simple to-one include ---
        const res1 = await userRepo
            .where((u) => u.id.eq(testUser.id))
            .include((u) => [u.department])
            .first()
            .go();
        if (res1?.department?.name !== 'Include Test Dept') {
            throw new Error(
                `[FAIL 14.1] To-one include failed. Department name was ${res1?.department?.name}`,
            );
        }
        console.log('   - PASSED: 14.1 Simple to-one include');

        // 3. --- Test simple to-many include ---
        const res2 = await userRepo
            .where((u) => u.id.eq(testUser.id))
            .include((u) => [u.posts])
            .first()
            .go();
        if (res2?.posts?.length !== 2) {
            throw new Error(
                `[FAIL 14.2] To-many include failed. Expected 2 posts, got ${res2?.posts?.length}`,
            );
        }
        console.log('   - PASSED: 14.2 Simple to-many include');

        // 4. --- Test multiple includes ---
        const res3 = await userRepo
            .where((u) => u.id.eq(testUser.id))
            .include((u) => [u.department, u.posts])
            .first()
            .go();
        if (
            res3?.department?.name !== 'Include Test Dept' ||
            res3?.posts?.length !== 2
        ) {
            throw new Error(`[FAIL 14.3] Multiple includes failed.`);
        }
        console.log('   - PASSED: 14.3 Multiple includes');

        // 5. --- Test include with alias ---
        const res4 = await userRepo
            .where((u) => u.id.eq(testUser.id))
            .include((u) => [u.posts.as('userPosts')])
            .first()
            .go();
        if (res4?.userPosts?.length !== 2) {
            throw new Error(
                `[FAIL 14.4] Include with alias failed. Expected 2 posts, got ${res4?.userPosts?.length}`,
            );
        }
        // Check that the original name is not present
        if ('posts' in (res4 || {})) {
            throw new Error(
                `[FAIL 14.4] Include with alias should not have original property name.`,
            );
        }
        console.log('   - PASSED: 14.4 Include with alias');

        // 6. --- Test include with field selector ---
        const res5 = await userRepo
            .where((u) => u.id.eq(testUser.id))
            .include((u) => [u.department.select((d) => [d.id])])
            .first((u) => [u.id, u.first_name])
            .go();
        if (
            !res5?.department?.id ||
            'name' in (res5?.department || {}) ||
            res5.id !== testUser.id ||
            res5.first_name !== 'Include'
        ) {
            throw new Error(
                `[FAIL 14.5] Include with field selector failed. Result: ${JSON.stringify(
                    res5,
                )}`,
            );
        }
        if ('last_name' in (res5 || {})) {
            throw new Error(
                `[FAIL 14.5] Field selector should not include non-selected fields.`,
            );
        }
        console.log('   - PASSED: 14.5 Include with field selector');

        // 7. --- Test include with filters inside ---
        const res6 = await userRepo
            .where((u) => u.id.eq(testUser.id))
            .include((u) => [u.posts.where((p) => p.is_published.eq(true))])
            .first()
            .go();
        if (
            res6?.posts?.length !== 1 ||
            res6.posts[0].title !== 'Include Post 1 (Published)'
        ) {
            throw new Error(
                `[FAIL 14.6] Include with where clause failed. Expected 1 post, got ${res6?.posts?.length}`,
            );
        }
        console.log('   - PASSED: 14.6 Include with where clause');

        // 8. --- Test nested include ---
        const res7 = await userRepo
            .where((u) => u.id.eq(testUser.id))
            .include((u) => [u.posts.include((p) => [p.comments])])
            .first()
            .go();
        const post1WithComments = res7?.posts.find(
            (p) => p.id === testPost1.id,
        );
        if (post1WithComments?.comments.length !== 2) {
            throw new Error(
                `[FAIL 14.7] Nested include failed. Expected 2 comments, got ${post1WithComments?.comments?.length}`,
            );
        }
        console.log('   - PASSED: 14.7 Nested include');

        // 9. --- Test include with selector and alias ---
        const res8 = await userRepo
            .where((u) => u.id.eq(testUser.id))
            .include((u) => [u.department.as('dept')])
            .first((u) => [u.id])
            .go();
        if (
            res8?.dept?.name !== 'Include Test Dept' ||
            res8.id !== testUser.id
        ) {
            throw new Error(
                `[FAIL 14.8] Include with selector and alias failed.`,
            );
        }
        if ('department' in (res8 || {}) || 'first_name' in (res8 || {})) {
            throw new Error(
                `[FAIL 14.8] Include with selector and alias returned incorrect shape.`,
            );
        }
        console.log('   - PASSED: 14.8 Include with selector and alias');
    }
}
