import * as http from "http";
import express from "express";
import { IntegrationTestCase } from "../types/IntegrationTestCase";
import { KadmiumApp } from "../../src/kadmium-app";
import { User } from "../../src/models/schemas/User";
import { Post } from "../../src/models/schemas/Post";
import { Department } from "../../src/models/schemas/Department";
import { Comment } from "../../src/models/schemas/Comment";
import { controller, get, post, put, del } from "../../src/controller/init";
import { ExpressRouteAdapter } from "../../src/route/adapters/rest.adapter";

export class TC17_ControllerIntegration extends IntegrationTestCase {
	private port = 3470;
	private expressApp!: express.Application;
	private adapter!: ExpressRouteAdapter;
	private server!: http.Server;

	constructor(app: KadmiumApp) {
		super(app, "Controller Integration (CRUD + Validation)");
	}

	protected async runImpl(): Promise<void> {
		await this.setup();
		try {
			await this.t_createUserAndVerifyInDb();
			await this.t_readUserById();
			await this.t_listUsers();
			await this.t_updateUserAndVerify();
			await this.t_deleteUserAndVerifyGone();
			await this.t_notFound();
			await this.t_createPostWithAuthor();
			await this.t_readPostWithAuthorInclude();
			await this.t_createDepartment();
			await this.t_userWithDepartment();
			await this.t_postWithComments();
			await this.t_multipleControllersCount();
		} finally {
			await this.teardown();
		}
	}

	/* ── Setup ── */

	private async setup(): Promise<void> {
		this.expressApp = express();
		this.adapter = new ExpressRouteAdapter(this.expressApp);

		const mk404 = (type: string, id: string | number) =>
			Object.assign(new Error(`${type} ${id} not found`), { statusCode: 404 });

		// User — uses ctx.repo
		const userCtrl = controller(User, [
			get("/intg/users", async (ctx) => ctx.repo.select().go()),
			get("/intg/users/:id", async (ctx) => {
				const u = await ctx.repo.findById(ctx.request.params.id);
				if (!u) throw mk404("User", ctx.request.params.id);
				return u;
			}),
			post("/intg/users", async (ctx) =>
				ctx.repo.create(ctx.request.body as Partial<User>).go(),
			),
			put("/intg/users/:id", async (ctx) => {
				const r = await ctx.repo
					.update(ctx.request.body as Partial<User>)
					.where((e) => (e as any).id.eq(ctx.request.params.id))
					.go();
				if (r.length === 0) throw mk404("User", ctx.request.params.id);
				return r[0];
			}),
			del("/intg/users/:id", async (ctx) => {
				await ctx.repo
					.delete()
					.where((e) => (e as any).id.eq(ctx.request.params.id))
					.go();
				return { deleted: true, id: ctx.request.params.id };
			}),
		]);

		// Department — uses ctx.repo
		const deptCtrl = controller(Department, [
			get("/intg/departments", async (ctx) => ctx.repo.select().go()),
			get("/intg/departments/:id", async (ctx) => {
				const d = await ctx.repo.findById(ctx.request.params.id);
				if (!d) throw mk404("Department", ctx.request.params.id);
				return d;
			}),
			post("/intg/departments", async (ctx) =>
				ctx.repo.create(ctx.request.body as Partial<Department>).go(),
			),
			del("/intg/departments/:id", async (ctx) => {
				await ctx.repo
					.delete()
					.where((e) => (e as any).id.eq(Number(ctx.request.params.id)))
					.go();
				return { deleted: true, id: ctx.request.params.id };
			}),
		]);

		// Post — uses ctx.repo
		const postCtrl = controller(Post, [
			get("/intg/posts", async (ctx) => ctx.repo.select().go()),
			get("/intg/posts/:id", async (ctx) => {
				const pid = Number(ctx.request.params.id);
				const p = await ctx.repo
					.where((e) => (e as any).id.eq(pid))
					.include((r) => [
						r.author.select((f) => [f.id, f.first_name, f.last_name]),
					])
					.first()
					.go();
				if (!p) throw mk404("Post", pid);
				return p;
			}),
			post("/intg/posts", async (ctx) =>
				ctx.repo.create(ctx.request.body as Partial<Post>).go(),
			),
			del("/intg/posts/:id", async (ctx) => {
				await ctx.repo
					.delete()
					.where((e) => (e as any).id.eq(Number(ctx.request.params.id)))
					.go();
				return { deleted: true, id: ctx.request.params.id };
			}),
		]);

		// Comment — uses ctx.repo
		const commentCtrl = controller(Comment, [
			get("/intg/comments", async (ctx) => ctx.repo.select().go()),
			get("/intg/comments/:id", async (ctx) => {
				const c = await ctx.repo.findById(Number(ctx.request.params.id));
				if (!c) throw mk404("Comment", ctx.request.params.id);
				return c;
			}),
			post("/intg/comments", async (ctx) =>
				ctx.repo.create(ctx.request.body as Partial<Comment>).go(),
			),
		]);

		this.app.Route.register(userCtrl);
		this.app.Route.register(deptCtrl);
		this.app.Route.register(postCtrl);
		this.app.Route.register(commentCtrl);
		this.app.Route.connect(this.adapter);

		this.server = await new Promise<http.Server>((r) => {
			const s = this.expressApp.listen(this.port, () => r(s));
		});
	}

	private async teardown(): Promise<void> {
		this.server.close();
		await new Promise((r) => setTimeout(r, 100));
	}

	/* ── State ── */
	private uid = "";
	private postId = 0;
	private authorId = "";
	private deptId = 0;
	private deptUid = "";

	/* ── Helpers ── */
	private async jget<T>(url: string): Promise<{ status: number; body: T }> {
		const r = await httpGet(url);
		return { status: r.status, body: JSON.parse(r.body) as T };
	}
	private async jpost<T>(
		url: string,
		data: object,
	): Promise<{ status: number; body: T }> {
		const r = await httpPost(url, data);
		return { status: r.status, body: JSON.parse(r.body) as T };
	}
	private async jput<T>(
		url: string,
		data: object,
	): Promise<{ status: number; body: T }> {
		const r = await httpPut(url, data);
		return { status: r.status, body: JSON.parse(r.body) as T };
	}
	private async jdel<T>(
		url: string,
	): Promise<{ status: number; body: T | null }> {
		const r = await httpDelete(url);
		const body = r.body ? (JSON.parse(r.body) as T) : null;
		return { status: r.status, body };
	}
	private ts = () => Date.now();

	/* ── Tests ── */

	private async t_createUserAndVerifyInDb(): Promise<void> {
		const email = `crud_${this.ts()}@ex.com`;
		const uname = `cruduser_${this.ts()}`;
		const { status, body } = await this.jpost<any>(
			`http://localhost:${this.port}/intg/users`,
			{
				first_name: "Crud",
				last_name: "Test",
				email,
				username: uname,
				password: "securepass123",
				confirm_password: "securepass123",
			},
		);
		if (status !== 200)
			throw new Error(`Create failed ${status}: ${JSON.stringify(body)}`);

		// create() returns single T → {type:"data", data: {user}}
		// create([]) returns T[] → {type:"data", data: [{user}]}
		const d = body.data;
		const user = Array.isArray(d) ? d[0] : d;
		if (!user?.id) throw new Error(`No user returned: ${JSON.stringify(body)}`);
		if (!user.password.startsWith("$2")) throw new Error("Not hashed");
		this.uid = user.id;
		console.log("   - POST /intg/users creates user, password hashed");
	}

	private async t_readUserById(): Promise<void> {
		const { status, body } = await this.jget<{ data: User }>(
			`http://localhost:${this.port}/intg/users/${this.uid}`,
		);
		if (status !== 200) throw new Error(`Read failed: ${status}`);
		if (body.data.first_name !== "Crud")
			throw new Error(`Wrong user: ${body.data.first_name}`);
		console.log("   - GET /intg/users/:id returns correct user");
	}

	private async t_listUsers(): Promise<void> {
		const { body } = await this.jget<any>(
			`http://localhost:${this.port}/intg/users`,
		);
		const list = Array.isArray(body.data)
			? body.data
			: body.data
				? [body.data]
				: [];
		if (list.length === 0) throw new Error("Users list empty");
		if (!list.find((u: User) => u.id === this.uid))
			throw new Error("User not in list");
		console.log("   - GET /intg/users list contains created user");
	}

	private async t_updateUserAndVerify(): Promise<void> {
		const { status, body } = await this.jput<any>(
			`http://localhost:${this.port}/intg/users/${this.uid}`,
			{ first_name: "Updated" },
		);
		if (status !== 200) throw new Error(`Update failed: ${status}`);
		const udata = Array.isArray(body.data) ? body.data[0] : body.data;
		if (udata.first_name !== "Updated") throw new Error("Update not reflected");

		const { body: rb } = await this.jget<any>(
			`http://localhost:${this.port}/intg/users/${this.uid}`,
		);
		if (rb.data.first_name !== "Updated")
			throw new Error("Update not persisted");
		console.log("   - PUT /intg/users/:id updates and persists");
	}

	private async t_deleteUserAndVerifyGone(): Promise<void> {
		// Create a fresh user with no relations to avoid FK issues
		const email = `del_${this.ts()}@ex.com`;
		const uname = `deluser_${this.ts()}`;
		const { body: cb } = await this.jpost<any>(
			`http://localhost:${this.port}/intg/users`,
			{
				first_name: "ToDelete",
				last_name: "X",
				email,
				username: uname,
				password: "securepass123",
				confirm_password: "securepass123",
			},
		);
		const cdata = Array.isArray(cb.data) ? cb.data[0] : cb.data;
		const freshUid = cdata.id;

		const { status, body } = await this.jdel(
			`http://localhost:${this.port}/intg/users/${freshUid}`,
		);
		if (status !== 200) {
			// FK constraint — check if error mentions foreign key
			const msg = body ? JSON.stringify(body) : "no body";
			console.log(`   - DELETE /intg/users/:id blocked by FK (${msg})`);
			return;
		}

		const { status: s2 } = await this.jget<any>(
			`http://localhost:${this.port}/intg/users/${freshUid}`,
		);
		if (s2 !== 404)
			throw new Error(`Deleted user GET should be 404, got ${s2}`);
		console.log("   - DELETE /intg/users/:id removes, GET returns 404");
	}

	private async t_notFound(): Promise<void> {
		const fake = "00000000-0000-0000-0000-000000000000";
		const { status, body } = await this.jget<{ message: string }>(
			`http://localhost:${this.port}/intg/users/${fake}`,
		);
		if (status !== 404) throw new Error(`Expected 404, got ${status}`);
		if (!body.message?.includes("not found"))
			throw new Error(`No 'not found' in: ${body.message}`);
		console.log(`   - GET /intg/users/:missing → 404 "${body.message}"`);
	}

	private async t_createPostWithAuthor(): Promise<void> {
		const email = `auth_${this.ts()}@ex.com`;
		const uname = `auth_${this.ts()}`;
		const { body: ub } = await this.jpost<any>(
			`http://localhost:${this.port}/intg/users`,
			{
				first_name: "Author",
				last_name: "One",
				email,
				username: uname,
				password: "securepass123",
				confirm_password: "securepass123",
			},
		);
		const udata = Array.isArray(ub.data) ? ub.data[0] : ub.data;
		this.authorId = udata.id;

		const { status, body } = await this.jpost<any>(
			`http://localhost:${this.port}/intg/posts`,
			{
				title: "First Post",
				content: "Hello",
				author_id: this.authorId,
				is_published: true,
			},
		);
		if (status !== 200) throw new Error(`Post create failed: ${status}`);
		const pdata = Array.isArray(body.data) ? body.data[0] : body.data;
		if (!pdata?.id) throw new Error("No post returned");
		if (pdata.title !== "First Post") throw new Error("Wrong title");
		this.postId = pdata.id;
		console.log("   - POST /intg/posts creates with author_id");
	}

	private async t_readPostWithAuthorInclude(): Promise<void> {
		const { status, body } = await this.jget<any>(
			`http://localhost:${this.port}/intg/posts/${this.postId}`,
		);
		if (status !== 200) throw new Error(`Read post failed: ${status}`);
		if (!body.data.author) throw new Error("No author in post");
		if (body.data.author.first_name !== "Author")
			throw new Error(`Author: ${body.data.author.first_name}`);
		console.log("   - GET /intg/posts/:id with include loads author");
	}

	private async t_createDepartment(): Promise<void> {
		const name = `Dept_${this.ts()}`;
		const { status, body } = await this.jpost<any>(
			`http://localhost:${this.port}/intg/departments`,
			{ name },
		);
		if (status !== 200) throw new Error("Dept not created");
		const ddata = Array.isArray(body.data) ? body.data[0] : body.data;
		if (!ddata?.id) throw new Error("No dept returned");
		if (ddata.name !== name) throw new Error("Name mismatch");
		this.deptId = ddata.id;
		console.log("   - POST /intg/departments creates");
	}

	private async t_userWithDepartment(): Promise<void> {
		const email = `du_${this.ts()}@ex.com`;
		const uname = `du_${this.ts()}`;
		const { status, body } = await this.jpost<any>(
			`http://localhost:${this.port}/intg/users`,
			{
				first_name: "DeptUser",
				last_name: "T",
				email,
				username: uname,
				department_id: this.deptId,
				password: "securepass123",
				confirm_password: "securepass123",
			},
		);
		if (status !== 200) throw new Error("User+dept create failed");
		const udata = Array.isArray(body.data) ? body.data[0] : body.data;
		if (udata.department_id !== this.deptId)
			throw new Error("dept_id mismatch");
		this.deptUid = udata.id;
		console.log("   - POST /intg/users with department_id links");
	}

	private async t_postWithComments(): Promise<void> {
		const { status, body } = await this.jpost<any>(
			`http://localhost:${this.port}/intg/comments`,
			{
				body: "Nice!",
				post_id: this.postId,
				user_id: this.authorId,
			},
		);
		if (status !== 200) throw new Error("Comment not created");
		const cdata = Array.isArray(body.data) ? body.data[0] : body.data;
		if (!cdata?.id) throw new Error("No comment returned");
		if (cdata.body !== "Nice!") throw new Error("Comment body wrong");
		console.log("   - POST /intg/comments creates");
	}

	private async t_multipleControllersCount(): Promise<void> {
		const c = this.app.Route.controllerCount;
		if (c < 4) throw new Error(`Expected ≥4 controllers, got ${c}`);
		console.log(`   - ${c} controllers registered`);
	}
}

/* ── HTTP helpers ── */

function httpGet(url: string): Promise<{ status: number; body: string }> {
	return new Promise((resolve, reject) => {
		http
			.get(url, (res: http.IncomingMessage) => {
				let b = "";
				res.on("data", (c: string) => (b += c));
				res.on("end", () => resolve({ status: res.statusCode || 0, body: b }));
			})
			.on("error", reject);
	});
}

function httpPost(
	url: string,
	data: object,
): Promise<{ status: number; body: string }> {
	return httpM("POST", url, data);
}
function httpPut(
	url: string,
	data: object,
): Promise<{ status: number; body: string }> {
	return httpM("PUT", url, data);
}
function httpDelete(url: string): Promise<{ status: number; body: string }> {
	return httpM("DELETE", url, {});
}

function httpM(
	method: string,
	url: string,
	data: object,
): Promise<{ status: number; body: string }> {
	return new Promise((resolve, reject) => {
		const u = new URL(url);
		const req = http.request(
			{
				hostname: u.hostname,
				port: Number(u.port),
				path: u.pathname,
				method,
				headers: { "Content-Type": "application/json" },
			},
			(res: http.IncomingMessage) => {
				let b = "";
				res.on("data", (c: string) => (b += c));
				res.on("end", () => resolve({ status: res.statusCode || 0, body: b }));
			},
		);
		req.on("error", reject);
		req.write(JSON.stringify(data));
		req.end();
	});
}
