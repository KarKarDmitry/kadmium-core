"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const init_1 = require("../controller/init");
const Post_1 = require("../models/schemas/Post");
const validation_1 = require("../validation");
exports.default = (0, init_1.controller)(Post_1.Post, [
    (0, init_1.get)("/posts", async (ctx) => {
        return ctx.repo
            .include((r) => [
            r.author.select((f) => [f.id, f.first_name, f.last_name]),
        ])
            .select()
            .go();
    }),
    (0, init_1.get)("/posts/:id", {
        validation: { params: { id: validation_1.v.number } },
    }, async (ctx, req) => {
        const post = await ctx.repo
            .include((r) => [
            r.author.select((f) => [f.id, f.first_name, f.last_name]),
        ])
            .where((e) => e.id.eq(req.params.id))
            .first()
            .go();
        if (!post)
            throw new Error("Post not found");
        return post;
    }),
    (0, init_1.post)("/posts", {
        validation: {
            body: {
                title: validation_1.v.string.min(1),
                author_id: validation_1.v.string,
                content: validation_1.v.string.opt,
                is_published: validation_1.v.boolean.opt,
            },
        },
    }, async (ctx, req) => {
        return ctx.repo.create(req.body).go();
    }),
    (0, init_1.put)("/posts/:id", {
        validation: { params: { id: validation_1.v.number } },
    }, async (ctx, req) => {
        return ctx.repo
            .update(req.body)
            .where((e) => e.id.eq(req.params.id))
            .go();
    }),
    (0, init_1.del)("/posts/:id", {
        validation: { params: { id: validation_1.v.number } },
    }, async (ctx, req) => {
        return ctx.repo
            .delete()
            .where((e) => e.id.eq(req.params.id))
            .go();
    }),
]);
//# sourceMappingURL=post.controller.js.map