import { controller, get, post, put, del } from '../controller/init.js';
import { Post } from '../models/schemas/Post.js';
import { v } from '../validation/index.js';

export default controller(Post, [
    get('/posts', async (ctx) => {
        return ctx.repo
            .include((r) => [
                r.author.select((f) => [f.id, f.first_name, f.last_name]),
            ])
            .select()
            .go();
    }),

    get(
        '/posts/:id',
        {
            validation: { params: { id: v.number } },
        },
        async (ctx, req) => {
            const post = await ctx.repo
                .where((e) => e.id.eq(req.params.id))
                .include((r) => [
                    r.author.select((f) => [f.id, f.first_name, f.last_name]),
                ])
                .first()
                .go();
            if (!post) throw new Error('Post not found');
            return post;
        },
    ),

    post(
        '/posts',
        {
            validation: {
                body: {
                    title: v.string.min(1),
                    author_id: v.string,
                    content: v.string.opt,
                    is_published: v.boolean.opt,
                },
            },
        },
        async (ctx, req) => {
            return ctx.repo.create(req.body).go();
        },
    ),

    put(
        '/posts/:id',
        {
            validation: { params: { id: v.number } },
        },
        async (ctx, req) => {
            return ctx.repo
                .update(req.body)
                .where((e) => e.id.eq(req.params.id))
                .go();
        },
    ),

    del(
        '/posts/:id',
        {
            validation: { params: { id: v.number } },
        },
        async (ctx, req) => {
            return ctx.repo
                .delete()
                .where((e) => e.id.eq(req.params.id))
                .go();
        },
    ),
]);
