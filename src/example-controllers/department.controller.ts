import { controller, get, post, del } from "../controller/init";
import { Department } from "../models/schemas/Department";
import { v } from "../validation";

export default controller(Department, [
	get("/departments", async (ctx) => {
		return ctx.repo.select().go();
	}),

	get(
		"/departments/:id",
		{
			validation: { params: { id: v.number } },
		},
		async (ctx, req) => {
			const dept = await ctx.repo
				.where((e) => e.id.eq(req.params.id))
				.first()
				.go();
			if (!dept) throw new Error("Department not found");
			return dept;
		},
	),

	post(
		"/departments",
		{
			validation: { body: { name: v.string.min(1).max(200) } },
		},
		async (ctx, req) => {
			return ctx.repo.create(req.body).go();
		},
	),

	del(
		"/departments/:id",
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
