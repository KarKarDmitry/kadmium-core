"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const init_1 = require("../controller/init");
const Department_1 = require("../models/schemas/Department");
const validation_1 = require("../validation");
exports.default = (0, init_1.controller)(Department_1.Department, [
    (0, init_1.get)("/departments", async (ctx) => {
        return ctx.repo.select().go();
    }),
    (0, init_1.get)("/departments/:id", {
        validation: { params: { id: validation_1.v.number } },
    }, async (ctx, req) => {
        const dept = await ctx.repo
            .where((e) => e.id.eq(req.params.id))
            .first()
            .go();
        if (!dept)
            throw new Error("Department not found");
        return dept;
    }),
    (0, init_1.post)("/departments", {
        validation: { body: { name: validation_1.v.string.min(1).max(200) } },
    }, async (ctx, req) => {
        return ctx.repo.create(req.body).go();
    }),
    (0, init_1.del)("/departments/:id", {
        validation: { params: { id: validation_1.v.number } },
    }, async (ctx, req) => {
        return ctx.repo
            .delete()
            .where((e) => e.id.eq(req.params.id))
            .go();
    }),
]);
//# sourceMappingURL=department.controller.js.map