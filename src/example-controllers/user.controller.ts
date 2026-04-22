import { controller, get, post, put, del } from "../controller/init";
import { User } from "../models/schemas/User";
import { v } from "../validation";

export default controller(User, [
	get("/users", async (ctx) => {
		return ctx.repo.select().go();
	}),

	get(
		"/users/:id",
		{
			validation: { params: { id: v.string } },
		},
		async (ctx, req) => {
			const user = await ctx.repo.findById(req.params.id);
			if (!user) throw new Error("User not found");
			return user;
		},
	),

	post(
		"/users",
		{
			validation: {
				body: {
					first_name: v.string.min(1).max(100),
					last_name: v.string.min(1).max(100),
					email: v.email,
					username: v.string.min(1),
					password: v.string.min(8),
					confirm_password: v.string.min(8),
				},
			},
		},
		async (ctx, req) => {
			return ctx.repo.create(req.body).go();
		},
	),

	put(
		"/users/:id",
		{
			validation: { params: { id: v.string } },
		},
		async (ctx, req) => {
			return ctx.repo
				.update(req.body)
				.where((e) => e.id.eq(req.params.id))
				.go();
		},
	),

	del(
		"/users/:id",
		{
			validation: { params: { id: v.string } },
		},
		async (ctx, req) => {
			return ctx.repo
				.delete()
				.where((e) => e.id.eq(req.params.id))
				.go();
		},
	),
]);
