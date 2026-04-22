"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const init_1 = require("../controller/init");
const User_1 = require("../models/schemas/User");
const validation_1 = require("../validation");
exports.default = (0, init_1.controller)(User_1.User, [
    (0, init_1.get)("/users", async (ctx) => {
        return ctx.repo.select().go();
    }),
    (0, init_1.get)("/users/:id", {
        validation: { params: { id: validation_1.v.string } },
    }, async (ctx, req) => {
        const user = await ctx.repo.findById(req.params.id);
        if (!user)
            throw new Error("User not found");
        return user;
    }),
    (0, init_1.post)("/users", {
        validation: {
            body: {
                first_name: validation_1.v.string.min(1).max(100),
                last_name: validation_1.v.string.min(1).max(100),
                email: validation_1.v.email,
                username: validation_1.v.string.min(1),
                password: validation_1.v.string.min(8),
                confirm_password: validation_1.v.string.min(8),
            },
        },
    }, async (ctx, req) => {
        return ctx.repo.create(req.body).go();
    }),
    (0, init_1.put)("/users/:id", {
        validation: { params: { id: validation_1.v.string } },
    }, async (ctx, req) => {
        return ctx.repo
            .update(req.body)
            .where((e) => e.id.eq(req.params.id))
            .go();
    }),
    (0, init_1.del)("/users/:id", {
        validation: { params: { id: validation_1.v.string } },
    }, async (ctx, req) => {
        return ctx.repo
            .delete()
            .where((e) => e.id.eq(req.params.id))
            .go();
    }),
]);
//# sourceMappingURL=user.controller.js.map