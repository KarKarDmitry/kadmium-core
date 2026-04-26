import { IntegrationTestCase } from '../types/IntegrationTestCase';
import { KadmiumApp } from '../../src/kadmium-app';
import { User } from '../../src/models/schemas/User';
import { Department } from '../../src/models/schemas/Department';
import { Post } from '../../src/models/schemas/Post';
import { Comment } from '../../src/models/schemas/Comment';

export class TC__OrmUsage extends IntegrationTestCase {
    constructor(app: KadmiumApp) {
        super(app, 'ORM Usage Examples - User Schema');
    }

    protected async runImpl(): Promise<void> {
        const userRepo = this.app.Repo.get(User);
        const departmentRepo = this.app.Repo.get(Department);
        const postRepo = this.app.Repo.get(Post);
        const commentRepo = this.app.Repo.get(Comment);

        console.log('--- ORM Usage Examples for User ---');

        // --- 1. Basic Create ---
        const newDepartment = await departmentRepo
            .create({ name: 'Engineering' })
            .go();
        const newUser = await userRepo
            .create({
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@example.com',
                username: 'johndoe',
                password: 'securepassword',
                confirm_password: 'securepassword',
                department_id: newDepartment.id,
            })
            .go();
        console.log(
            `1. Created User: ${newUser.first_name} (ID: ${newUser.id})`,
        );

        // --- 2. Find by ID ---
        const foundUser = await userRepo.findById(newUser.id);
        if (!foundUser) throw new Error('2. User not found by ID.');
        console.log(`2. Found User by ID: ${foundUser.username}`);

        // --- 3. Basic Select (all public fields) ---
        const usersPublic = await userRepo.select().go();
        console.log(
            `3. Selected all public users. Count: ${usersPublic.length}`,
        );

        // --- 4. Select specific fields with alias ---
        const userNames = await userRepo
            .select((u) => [
                u.first_name.as('firstName'),
                u.last_name.as('lastName'),
            ])
            .go();
        console.log(
            `4. Selected specific user fields: ${userNames[0]?.firstName} ${userNames[0]?.lastName}`,
        );

        // --- 5. Where clause (simple) ---
        const specificUser = await userRepo
            .where((u) => u.username.eq('johndoe'))
            .first()
            .go();
        if (!specificUser)
            throw new Error('5. User not found with where clause.');
        console.log(`5. Found user with username 'johndoe'.`);

        // --- 6. Where clause (complex with AND/OR groups) ---
        const complexFilterUser = await userRepo
            .where((u) => u.first_name.eq('John'))
            .and((u) => u.last_name.eq('Doe'))
            .or((u) => u.email.eq('nonexistent@example.com'))
            .first()
            .go();
        if (!complexFilterUser) throw new Error('6. Complex filter failed.');
        console.log(`6. Complex filter for user successful.`);

        // --- 7. Order by ---
        const orderedUsers = await userRepo
            .select((u) => [u.first_name])
            .order((u) => u.first_name, 'desc')
            .limit(1)
            .go();
        console.log(
            `7. Ordered users by first_name DESC: ${orderedUsers[0]?.first_name}`,
        );

        // --- 8. Limit and Offset ---
        const limitedUsers = await userRepo.select().limit(1).offset(0).go();
        console.log(`8. Limited users: ${limitedUsers.length}`);

        // --- 9. Pagination ---
        const paginatedUsers = await userRepo.select().page(1, 1).go();
        console.log(
            `9. Paginated users (page 1, size 1): ${paginatedUsers.length}`,
        );

        // --- 10. Count ---
        const userCount = await userRepo.countAll().go();
        console.log(`10. Total user count: ${userCount}`);

        // --- 11. Exists ---
        const userExists = await userRepo
            .where((u) => u.username.eq('johndoe'))
            .exists()
            .go();
        console.log(`11. User 'johndoe' exists: ${userExists}`);

        // --- 12. Update ---
        await userRepo
            .where((u) => u.id.eq(newUser.id))
            .update({ first_name: 'Jonathan' })
            .go();
        let updatedUser = await userRepo.findById(newUser.id);
        if (updatedUser?.first_name !== 'Jonathan')
            throw new Error('12. User update failed.');
        console.log(
            `12. User updated first_name to: ${updatedUser.first_name}`,
        );

        // --- 13. Raw SQL Query ---
        const rawQueryResult = await this.app.Repo.raw(
            'SELECT first_name FROM "user" WHERE id = $1',
            [newUser.id],
        ).go<{ first_name: string }>();
        console.log(`13. Raw query result: ${rawQueryResult[0]?.first_name}`);

        // --- 14. Including ToOne Relation (Department) ---
        const userWithDepartment = await userRepo
            .where((u) => u.id.eq(newUser.id))
            .include((u) => [u.department])
            .include((u) => [u.comments])
            .first()
            .go();

        if (userWithDepartment?.department?.name !== newDepartment.name)
            throw new Error('14. ToOne include failed.');
        console.log(
            `14. User with Department: ${userWithDepartment.department.name}`,
        );

        // --- 15. Including ToMany Relation (Posts) with filtering/ordering/limiting ---
        const newPost1 = await postRepo
            .create({
                title: "John's First Post",
                author_id: newUser.id,
                is_published: true,
            })
            .go();
        const newPost2 = await postRepo
            .create({
                title: "John's Second Post",
                author_id: newUser.id,
                is_published: false,
            })
            .go();

        const userWithPosts: any = await userRepo
            .where((u) => u.id.eq(newUser.id))
            .include((u) => [
                u.posts
                    .where((p) => p.is_published.eq(true))
                    .order((p) => p.title, 'desc')
                    .limit(1)
                    .as('publishedPosts'),
            ])
            .first()
            .go();

        if (
            userWithPosts?.publishedPosts?.length !== 1 ||
            userWithPosts.publishedPosts[0]?.title !== "John's First Post"
        )
            throw new Error('15. ToMany include with filters failed.');
        console.log(
            `15. User with 1 published post: ${userWithPosts.publishedPosts[0]?.title}`,
        );

        // --- 16. Including ToMany Relation (Comments) ---
        const newComment = await commentRepo
            .create({
                body: 'Great post!',
                post_id: newPost1.id,
                user_id: newUser.id,
            })
            .go();

        const userWithComments: any = await userRepo
            .where((u) => u.id.eq(newUser.id))
            .include((u) => [u.comments])
            .first()
            .go();
        if (userWithComments?.comments?.length !== 1)
            throw new Error('16. ToMany include failed.');
        console.log(
            `16. User with comments: ${userWithComments.comments[0]?.body}`,
        );

        // --- 17. Including multiple relations ---
        const userWithAllRelations: any = await userRepo
            .where((u) => u.id.eq(newUser.id))
            .include((u) => [u.department, u.posts.as('userPosts'), u.comments])
            .first((u) => [u.id, u.first_name.as('name')])
            .go();
        if (
            !userWithAllRelations?.department ||
            !userWithAllRelations.userPosts ||
            !userWithAllRelations.comments
        )
            throw new Error('17. Multiple includes failed.');
        console.log(
            `17. User '${userWithAllRelations.name}' with multiple relations loaded.`,
        );

        // --- 18. Nested Include (Posts and their Comments) ---
        const userWithPostsAndComments = await userRepo
            .where((u) => u.id.eq(newUser.id))
            .include((u) => [
                u.posts.include((p) => [p.comments.include((c) => [c.user])]),
            ])
            .first()
            .go();

        userWithPostsAndComments?.posts?.[0]?.comments?.[0]?.user;

        if (!userWithPostsAndComments?.posts[0]?.comments) {
            throw new Error('18. Nested include failed.');
        }

        if (userWithPostsAndComments.posts[0].comments.length !== 1) {
            throw new Error(
                '18. Nested include did not find the correct number of comments.',
            );
        }

        console.log(
            `18. Nested include successful: Found post with ${userWithPostsAndComments.posts[0].comments.length} comment(s).`,
        );

        // --- 19. Basic Multi-Table Query (User and Department) ---
        const usersAndDepartments = await this.app.Repo.query({
            u: User,
            d: Department,
        })
            .join({
                left: 'u',
                right: 'd',
                on: (t) => t.u.department_id.eq(t.d.id),
            })
            .where((t) => t.u.id.eq(newUser.id))
            .select((t) => [t.u.first_name, t.d.name.as('departmentName')])
            .go();
        if (
            usersAndDepartments.length !== 1 ||
            usersAndDepartments[0].d.departmentName !== newDepartment.name
        ) {
            throw new Error('19. Basic multi-table query failed.');
        }
        console.log(
            `19. User '${usersAndDepartments[0].u.first_name}' works in '${usersAndDepartments[0].d.departmentName}'.`,
        );

        // --- 20. Multi-Table Query with WHERE and GROUP BY (Users, Posts, and Comments) ---
        const userActivity = await this.app.Repo.query({
            u: User,
            p: Post,
            c: Comment,
        })
            .join({
                left: 'u',
                right: 'p',
                on: (t) => t.u.id.eq(t.p.author_id),
            })
            .join({ left: 'p', right: 'c', on: (t) => t.p.id.eq(t.c.post_id) })
            .where((t) => t.u.id.eq(newUser.id))
            .and((t) => t.c.body.ilike('Great'))
            .groupBy((t) => [t.u.first_name, t.u.last_name])
            .select((t, { count }) => [
                t.u.first_name,
                count(t.p.id).as('postCount'),
                count(t.c.id).as('commentCount'),
            ])
            .go();

        if (
            userActivity.length !== 1 ||
            userActivity[0].postCount !== 1 ||
            userActivity[0].commentCount !== 1
        ) {
            throw new Error(
                '20. Complex multi-table query with GROUP BY failed.',
            );
        }
        console.log(
            `20. User '${userActivity[0].u.first_name}' has ${userActivity[0].postCount} post and ${userActivity[0].commentCount} comment matching criteria.`,
        );

        // --- 21. Multi-Table Query with include() (User, Post, and included Department for User) ---
        const userPostsWithDepartment = await this.app.Repo.query({
            u: User,
            p: Post,
        })
            .join({
                left: 'u',
                right: 'p',
                on: (t) => t.u.id.eq(t.p.author_id),
            })
            .where((t) => t.u.id.eq(newUser.id))
            .include((t) => [
                t.u.department,
                t.u.posts.include((u) => [u.comments.include((c) => [c.user])]),
            ]) // Include department for the User model
            .select((t) => [t.u.first_name, t.p.title.as('postTitle')])
            .go();

        if (
            userPostsWithDepartment.length !== 2 ||
            !userPostsWithDepartment[0].u.department
        ) {
            throw new Error('21. Multi-table query with include() failed.');
        }
        console.log(
            `21. Multi-table query for user posts. User department: ${userPostsWithDepartment[0].u.department.name}`,
        );
    }
}
