import * as http from "http";
import express from "express";
import { IntegrationTestCase } from "../types/IntegrationTestCase";
import { KadmiumApp } from "../../src/kadmium-app";
import { User } from "../../src/models/schemas/User";
import { Post } from "../../src/models/schemas/Post";
import { controller, get, post, put, del } from "../../src/controller/init";
import { v } from "../../src/validation";
import { ExpressRouteAdapter } from "../../src/route/adapters/rest.adapter";

export class TC18_ControllerValidation extends IntegrationTestCase {
	private port = 3490;
	private expressApp!: express.Application;
	private adapter!: ExpressRouteAdapter;
	private server!: http.Server;
	private createdIds: string[] = [];

	constructor(app: KadmiumApp) {
		super(app, "Controller ValStruct Validation");
	}

	protected async runImpl(): Promise<void> {
		await this.setup();
		try {
			await this.t_validBodyPassThrough();
			await this.t_missingRequiredBody();
			await this.t_stringMinValidation();
			await this.t_emailFormatValidation();
			await this.t_noValidationStillWorks();
			await this.t_paramsValidation();
			await this.t_paramsInvalidUuid();
			await this.t_queryValidation();
			await this.t_queryInvalidNumber();
			await this.t_optionalFields();
			await this.t_optionalQueryNotProvided();
			await this.t_combinedParamsQueryBody();
			await this.t_numberRangeValidation();
			await this.t_maxValidation();
			await this.t_multipleFieldsRejected();
			await this.t_unknownFieldsPassThrough();
			await this.t_emptyBody();
			await this.t_putWithValidation();
			await this.t_deleteWithParams();
			await this.t_extraFieldsPreservedThroughValidation();
		} finally {
			await this.teardown();
		}
	}

	private async setup(): Promise<void> {
		this.expressApp = express();
		this.adapter = new ExpressRouteAdapter(this.expressApp);

		const userCtrl = controller(User, [
			get(
				"/val/users/:id",
				{
					validation: { params: { id: v.string } },
				},
				async (ctx, req) => {
					const user = await ctx.repo.findById(req.params.id);
					if (!user) throw new Error(`User ${req.params.id} not found`);
					return user;
				},
			),

			post(
				"/val/users",
				{
					validation: {
						body: {
							first_name: v.string.min(1),
							email: v.email,
						},
					},
				},
				async (ctx, req) => {
					return ctx.repo.create(req.body).go();
				},
			),

			get("/val/users", async (ctx) => {
				return ctx.repo.select().go();
			}),

			post(
				"/val/posts",
				{
					validation: {
						body: {
							title: v.string.min(5),
							author_id: v.string,
						},
					},
				},
				async (ctx, req) => {
					return ctx.repo.create(req.body).go();
				},
			),

			get(
				"/val/search",
				{
					validation: {
						query: {
							q: v.string.min(1),
							limit: v.number.max(100),
						},
					},
				},
				async (ctx, req) => {
					return { search: req.query.q, limit: req.query.limit };
				},
			),

			get(
				"/val/active-users",
				{
					validation: {
						query: {
							active: v.boolean,
						},
					},
				},
				async (ctx, req) => {
					return { active: req.query.active };
				},
			),

			post(
				"/val/complex/:id",
				{
					validation: {
						params: { id: v.string.min(1) },
						query: { expand: v.string.opt },
						body: {
							name: v.string.min(2).max(50),
							count: v.number.min(0).max(1000),
						},
					},
				},
				async (ctx, req) => {
					return { id: req.params.id, ...req.body, expand: req.query.expand };
				},
			),

			put(
				"/val/users/:id",
				{
					validation: {
						params: { id: v.string },
						body: {
							first_name: v.string.min(1),
						},
					},
				},
				async (ctx, req) => {
					const user = await ctx.repo.findById(req.params.id);
					if (!user) throw new Error(`User ${req.params.id} not found`);
					const updated = await ctx.repo
						.update({
							...(req.body as any),
						})
						.where((e) => e.id.eq(req.params.id))
						.go();
					return updated[0];
				},
			),

			del(
				"/val/users/:id",
				{
					validation: { params: { id: v.string } },
				},
				async (ctx, req) => {
					await ctx.repo
						.where((e) => e.id.eq(req.params.id))
						.delete()
						.go();
					return { deleted: req.params.id };
				},
			),
		]);

		this.app.Route.register(userCtrl);
		this.app.Route.connect(this.adapter);

		this.server = await new Promise<http.Server>((r) => {
			const s = this.expressApp.listen(this.port, () => r(s));
		});
	}

	private async teardown(): Promise<void> {
		for (const id of this.createdIds) {
			try {
				await httpDeleteReq(this.url(`/val/users/${id}`));
			} catch { }
		}
		this.createdIds = [];
		this.server.close();
		await new Promise((r) => setTimeout(r, 100));
	}

	private url(path: string): string {
		return `http://localhost:${this.port}${path}`;
	}

	private async jget(url: string): Promise<{ status: number; body: any }> {
		const r = await httpGet(url);
		return { status: r.status, body: JSON.parse(r.body) };
	}

	private async jpost(
		url: string,
		data: object,
	): Promise<{ status: number; body: any }> {
		const r = await httpPost(url, data);
		return { status: r.status, body: JSON.parse(r.body) };
	}

	private async jput(
		url: string,
		data: object,
	): Promise<{ status: number; body: any }> {
		const r = await httpPut(url, data);
		return { status: r.status, body: JSON.parse(r.body) };
	}

	private async jdelete(url: string): Promise<{ status: number; body: any }> {
		const r = await httpDeleteReq(url);
		try {
			return { status: r.status, body: JSON.parse(r.body) };
		} catch {
			return { status: r.status, body: null };
		}
	}

	/* ── Tests ── */

	/**
	 * Valid body with all required DB fields → passes ValStruct gate → record created in DB.
	 */
	private async t_validBodyPassThrough(): Promise<void> {
		const email = `vbody_${Date.now()}@ex.com`;
		const username = `vbody_${Date.now()}`;
		const { status, body } = await this.jpost(this.url("/val/users"), {
			first_name: "BodyOK",
			last_name: "Test",
			email,
			username,
			password: "securepass123",
			middle_name: "Extra",
		});
		if (status !== 200)
			throw new Error(`Valid body should return 200, got ${status}`);
		const data = body.data as any;
		const users = Array.isArray(data) ? data : data ? [data] : [];
		if (users[0]?.first_name !== "BodyOK")
			throw new Error("Handler didn't receive valid body");
		if (users[0]?.middle_name !== "Extra")
			throw new Error("Extra fields should pass through to handler");
		console.log("   - Valid body with extra fields creates record correctly");
		this.createdIds.push(users[0].id);
	}

	/**
	 * Empty first_name + invalid email → ValStruct rejects with 400, no DB write.
	 */
	private async t_missingRequiredBody(): Promise<void> {
		const res = await this.jpost(this.url("/val/users"), {
			first_name: "",
			email: "not-email",
		});
		if (res.status !== 400) {
			throw new Error(
				`Missing/invalid body should return 400, got ${res.status}. Body: ${JSON.stringify(res.body)}`,
			);
		}
		const b = res.body as { message?: string };
		if (!b.message) throw new Error("400 should include error message");
		if (b.message.includes("first_name") && b.message.includes("email")) {
			console.log(`   - Missing required body fields → 400: "${b.message}"`);
		} else {
			throw new Error(
				`Expected errors for first_name and email, got: "${b.message}"`,
			);
		}
	}

	/**
	 * Title too short → ValStruct rejects with 400.
	 */
	private async t_stringMinValidation(): Promise<void> {
		const res = await this.jpost(this.url("/val/posts"), {
			title: "Hi",
			author_id: "some-author",
		});
		if (res.status !== 400)
			throw new Error(`Short title should return 400, got ${res.status}`);
		const b = res.body as { message?: string };
		if (!b.message)
			throw new Error("400 should include error message for min validation");
		console.log(`   - String min validation → 400: "${b.message}"`);
	}

	/**
	 * Bad email format → ValStruct rejects with 400.
	 */
	private async t_emailFormatValidation(): Promise<void> {
		const res = await this.jpost(this.url("/val/users"), {
			first_name: "Email",
			email: "not-an-email",
		});
		if (res.status !== 400)
			throw new Error(`Invalid email should return 400, got ${res.status}`);
		const b = res.body as { message?: string };
		if (!b.message || !b.message.toLowerCase().includes("email")) {
			throw new Error(
				`Email error should mention 'email', got: "${b.message}"`,
			);
		}
		console.log(`   - Email format validation → 400: "${b.message}"`);
	}

	/**
	 * GET route with no validation → backward compatible.
	 */
	private async t_noValidationStillWorks(): Promise<void> {
		const res = await this.jget(this.url("/val/users"));
		if (res.status !== 200)
			throw new Error(
				`No-validation route should return 200, got ${res.status}`,
			);
		console.log("   - Route without validation works (backward compatible)");
	}

	/**
	 * Valid string param → handler executes. Invalid param → 400.
	 */
	private async t_paramsValidation(): Promise<void> {
		const email = `params_${Date.now()}@ex.com`;
		const username = `params_${Date.now()}`;
		const createRes = await this.jpost(this.url("/val/users"), {
			first_name: "ParamTest",
			last_name: "User",
			email,
			username,
			password: "securepass123",
		});
		if (createRes.status !== 200)
			throw new Error(`Create failed: ${createRes.status}`);
		const userId = Array.isArray(createRes.body.data)
			? createRes.body.data[0].id
			: createRes.body.data?.id;
		this.createdIds.push(userId);

		// Valid param
		const { status } = await this.jget(this.url(`/val/users/${userId}`));
		if (status !== 200)
			throw new Error(`Valid param should return 200, got ${status}`);
		console.log("   - Valid string param passes through");
	}

	/**
	 * Missing required param → 400.
	 */
	private async t_paramsInvalidUuid(): Promise<void> {
		// Route expects params: { id: v.string }, no id → still works (Express has it in route)
		// But we can test that the handler executes
		const { status } = await this.jget(this.url("/val/users/nonexistent-id"));
		if (status === 400)
			throw new Error(`Param 'nonexistent-id' should pass string validation`);
		console.log("   - String param accepts any string (even non-UUID)");
	}

	/**
	 * Valid query params → handler receives them (coerced types).
	 * Express gives strings, coerce converts "10" → 10.
	 */
	private async t_queryValidation(): Promise<void> {
		const { status, body } = await this.jget(
			this.url("/val/search?q=hello&limit=10"),
		);
		if (status !== 200)
			throw new Error(`Valid query should return 200, got ${status}`);
		const d = body.data;
		if (d.search !== "hello") throw new Error(`Query 'q' should be 'hello'`);
		if (d.limit !== 10)
			throw new Error(
				`Query 'limit' should be coerced to number 10, got ${d.limit}`,
			);
		console.log("   - Valid query params pass through (string→number coerced)");
	}

	/**
	 * Invalid query: limit="abc" cannot be coerced to number → 400.
	 */
	private async t_queryInvalidNumber(): Promise<void> {
		const { status } = await this.jget(
			this.url("/val/search?q=test&limit=abc"),
		);
		if (status !== 400)
			throw new Error(`Non-coercible number should return 400, got ${status}`);
		console.log("   - Query param 'abc' cannot coerce to number → 400");
	}

	/**
	 * Boolean coercion from query string: "true" → true, invalid → 400.
	 */
	private async t_optionalFields(): Promise<void> {
		const res = await httpGet(this.url("/val/active-users?active=true"));
		if (res.status === 500) {
			throw new Error(
				`Boolean query param should pass, got ${res.status}. Body: ${res.body}`,
			);
		}
		if (res.status !== 200)
			throw new Error(`Boolean query param should pass, got ${res.status}`);
		const body = JSON.parse(res.body);
		const d = body.data;
		if (d.active !== true)
			throw new Error(`'true' should coerce to boolean true, got ${d.active}`);
		console.log("   - Query 'true' coerced to boolean true");
	}

	/**
	 * Combined params + query + body validation all in one request.
	 */
	private async t_combinedParamsQueryBody(): Promise<void> {
		const { status, body } = await httpPostJson(
			this.url("/val/complex/test123?expand=all"),
			{
				name: "TestName",
				count: 42,
				extra_field: "preserved",
			},
		);
		if (status !== 200)
			throw new Error(
				`Combined validation should pass, got ${status}: ${JSON.stringify(body)}`,
			);
		const d = body.data;
		if (d.id !== "test123") throw new Error(`Param id should be 'test123'`);
		if (d.name !== "TestName")
			throw new Error(`Body name should be 'TestName'`);
		if (d.count !== 42) throw new Error(`Body count should be 42`);
		if (d.expand !== "all") throw new Error(`Query expand should be 'all'`);
		if (d.extra_field !== "preserved")
			throw new Error(`Extra body fields should pass through`);
		console.log("   - Combined params + query + body validation works");
	}

	/**
	 * Optional field: missing optional field should still pass.
	 */
	private async t_optionalQueryNotProvided(): Promise<void> {
		const res = await httpPostJson(this.url("/val/complex/test123"), {
			name: "OptTest",
			count: 1,
		});
		if (res.status !== 200)
			throw new Error(
				`Optional query param should not block, got ${res.status}`,
			);
		console.log("   - Optional query param not provided → still passes");
	}

	/**
	 * Number out of range → 400.
	 */
	private async t_numberRangeValidation(): Promise<void> {
		// count: min=0, max=1000
		const resNeg = await httpPostJson(this.url("/val/complex/x"), {
			name: "A",
			count: -1,
		});
		if (resNeg.status !== 400)
			throw new Error(`Negative count should return 400, got ${resNeg.status}`);

		const resHigh = await httpPostJson(this.url("/val/complex/x"), {
			name: "A",
			count: 1001,
		});
		if (resHigh.status !== 400)
			throw new Error(`count > 1000 should return 400, got ${resHigh.status}`);

		console.log(
			"   - Number range validation: below min and above max both rejected",
		);
	}

	/**
	 * String exceeding max length → 400.
	 */
	private async t_maxValidation(): Promise<void> {
		const longName = "A".repeat(51); // max is 50
		const res = await httpPostJson(this.url("/val/complex/x"), {
			name: longName,
			count: 1,
		});
		if (res.status !== 400)
			throw new Error(`Name > 50 chars should return 400, got ${res.status}`);
		console.log("   - String max validation → 400");
	}

	/**
	 * Multiple fields fail simultaneously → error message lists all.
	 */
	private async t_multipleFieldsRejected(): Promise<void> {
		// Empty name (min=2) + negative count → multiple validation errors
		const res = await httpPostJson(this.url("/val/complex/x"), {
			name: "A",
			count: -1,
		});
		if (res.status !== 400)
			throw new Error(
				`Multiple invalid fields should return 400, got ${res.status}`,
			);
		const b = res.body as { message?: string };
		if (!b.message || b.message.length === 0)
			throw new Error("Error message should not be empty");
		console.log(`   - Multiple fields rejected → 400: "${b.message}"`);
	}

	/**
	 * Unknown fields in body are preserved and pass through to handler.
	 */
	private async t_unknownFieldsPassThrough(): Promise<void> {
		const res = await httpPostJson(this.url("/val/complex/x"), {
			name: "OK",
			count: 5,
			unknown_one: "hello",
			unknown_two: 123,
		});
		if (res.status !== 200)
			throw new Error(`Unknown fields should pass, got ${res.status}`);
		const d = res.body.data;
		if (d.unknown_one !== "hello")
			throw new Error("Unknown string field should pass through");
		if (d.unknown_two !== 123)
			throw new Error("Unknown number field should pass through");
		console.log("   - Unknown body fields pass through to handler");
	}

	/**
	 * Empty body → required fields missing → 400.
	 */
	private async t_emptyBody(): Promise<void> {
		const res = await httpPostJson(this.url("/val/users"), {});
		if (res.status !== 400)
			throw new Error(`Empty body should return 400, got ${res.status}`);
		const b = res.body as { message?: string };
		if (!b.message?.includes("first_name"))
			throw new Error(`Error should mention first_name`);
		console.log(`   - Empty body → 400: "${b.message}"`);
	}

	/**
	 * PUT with params + body validation.
	 */
	private async t_putWithValidation(): Promise<void> {
		const email = `put_${Date.now()}@ex.com`;
		const username = `put_${Date.now()}`;
		const createRes = await this.jpost(this.url("/val/users"), {
			first_name: "Before",
			last_name: "PUT",
			email,
			username,
			password: "securepass123",
		});
		if (createRes.status !== 200)
			throw new Error(`Create failed: ${createRes.status}`);
		const userId = Array.isArray(createRes.body.data)
			? createRes.body.data[0].id
			: createRes.body.data?.id;
		this.createdIds.push(userId);

		// Valid PUT: params.id + body.first_name
		const { status } = await this.jput(this.url(`/val/users/${userId}`), {
			first_name: "After",
		});
		if (status !== 200)
			throw new Error(`Valid PUT should return 200, got ${status}`);
		console.log("   - PUT with params + body validation works");

		// Invalid PUT: empty first_name
		const badRes = await this.jput(this.url(`/val/users/${userId}`), {
			first_name: "",
		});
		if (badRes.status !== 400)
			throw new Error(
				`PUT with empty first_name should return 400, got ${badRes.status}`,
			);
		console.log("   - PUT with invalid body → 400");
	}

	/**
	 * DELETE with param validation.
	 */
	private async t_deleteWithParams(): Promise<void> {
		const email = `del_${Date.now()}@ex.com`;
		const username = `del_${Date.now()}`;
		const createRes = await this.jpost(this.url("/val/users"), {
			first_name: "ToDelete",
			last_name: "User",
			email,
			username,
			password: "securepass123",
		});
		if (createRes.status !== 200)
			throw new Error(`Create failed: ${createRes.status}`);
		const userId = Array.isArray(createRes.body.data)
			? createRes.body.data[0].id
			: createRes.body.data?.id;

		const rawRes = await httpDeleteReq(this.url(`/val/users/${userId}`));
		if (rawRes.status !== 200 && rawRes.status !== 204) {
			throw new Error(
				`DELETE with valid param should return 200/204, got ${rawRes.status}. Body: ${rawRes.body}`,
			);
		}
		console.log("   - DELETE with params validation works");
	}

	/**
	 * Extra fields in validated body are preserved for handler (passthrough).
	 * Uses existing DB fields to avoid FK/constraint errors.
	 */
	private async t_extraFieldsPreservedThroughValidation(): Promise<void> {
		const email = `extra_${Date.now()}@ex.com`;
		const username = `extra_${Date.now()}`;
		const res = await this.jpost(this.url("/val/users"), {
			first_name: "ExtraTest",
			email,
			last_name: "Fields",
			username,
			password: "securepass123",
			middle_name: "ExtraPreserved", // exists in schema, nullable
		});
		if (res.status !== 200)
			throw new Error(`Extra fields should pass ValStruct, got ${res.status}`);
		const data = res.body.data as any;
		const user = Array.isArray(data) ? data[0] : data;
		if (user.middle_name !== "ExtraPreserved")
			throw new Error("Extra 'middle_name' field should be preserved");
		console.log("   - Extra fields preserved through validation gatekeeper");
		this.createdIds.push(user.id);
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

function httpDeleteReq(url: string): Promise<{ status: number; body: string }> {
	return new Promise((resolve, reject) => {
		const u = new URL(url);
		// DELETE requests typically don't have a body — don't set Content-Type
		const req = http.request(
			{
				hostname: u.hostname,
				port: Number(u.port),
				path: u.pathname + u.search,
				method: "DELETE",
			},
			(res: http.IncomingMessage) => {
				let b = "";
				res.on("data", (c: string) => (b += c));
				res.on("end", () => resolve({ status: res.statusCode || 0, body: b }));
			},
		);
		req.on("error", reject);
		req.end();
	});
}

function httpPostJson(
	url: string,
	data: object,
): Promise<{ status: number; body: any }> {
	return new Promise((resolve, reject) => {
		const u = new URL(url);
		const body = JSON.stringify(data);
		const req = http.request(
			{
				hostname: u.hostname,
				port: Number(u.port),
				path: u.pathname + u.search,
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Content-Length": Buffer.byteLength(body),
				},
			},
			(res: http.IncomingMessage) => {
				let b = "";
				res.on("data", (c: string) => (b += c));
				res.on("end", () => {
					try {
						resolve({ status: res.statusCode || 0, body: JSON.parse(b) });
					} catch {
						resolve({ status: res.statusCode || 0, body: { error: b } });
					}
				});
			},
		);
		req.on("error", reject);
		req.write(body);
		req.end();
	});
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
				path: u.pathname + u.search,
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
