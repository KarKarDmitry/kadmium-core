import * as http from "http";
import express from "express";
import { IntegrationTestCase } from "../types/IntegrationTestCase";
import { KadmiumApp } from "../../src/kadmium-app";
import { User } from "../../src/models/schemas/User";
import { controller, get, post, put, del, patch } from "../../src/controller/init";
import { ExpressRouteAdapter } from "../../src/route/adapters/rest.adapter";
import { RouteMiddleware } from "../../src/route/types/adapter";

export class TC16_Controllers extends IntegrationTestCase {
	constructor(app: KadmiumApp) {
		super(app, "Controllers & Routes");
	}

	protected async runImpl(): Promise<void> {
		await this.testDSL();
		await this.testControllerRegistration();
		await this.testHttpPipeline();
		await this.testErrorHandler();
		await this.testMiddleware();
		await this.testPatchMethod();
	}

	// --- Unit test: DSL functions ---
	private testDSL(): void {
		const routes = [
			get("/test", async () => ({})),
			post("/test", async () => ({})),
			put("/test", async () => ({})),
			del("/test", async () => ({})),
			patch("/test", async () => ({})),
		];

		if (routes[0].method !== "get")
			throw new Error("get() should set method to 'get'");
		if (routes[1].method !== "post")
			throw new Error("post() should set method to 'post'");
		if (routes[2].method !== "put")
			throw new Error("put() should set method to 'put'");
		if (routes[3].method !== "delete")
			throw new Error("del() should set method to 'delete'");
		if (routes[4].method !== "patch")
			throw new Error("patch() should set method to 'patch'");

		// POST/PUT/DELETE/PATCH should default to transactional: true
		for (let i = 1; i <= 4; i++) {
			if (routes[i].options?.transactional !== true) {
				throw new Error(`Route ${i} should default to transactional: true`);
			}
		}
		// GET should NOT default to transactional
		if (routes[0].options?.transactional !== undefined) {
			throw new Error("get() should not set transactional");
		}

		// Custom options should override defaults
		const customPost = post(
			"/test",
			{ transactional: false },
			async () => ({}),
		);
		if (customPost.options?.transactional !== false) {
			throw new Error("Custom transactional option should override default");
		}

		console.log("   - DSL functions work correctly");
	}

	// --- Unit test: Controller registration ---
	private testControllerRegistration(): void {
		const testController = controller(User, [
			get("/users", async (ctx) => ctx.repo.select().go()),
		]);

		if (testController._meta !== "controller")
			throw new Error("controller() should set _meta to 'controller'");
		if (testController.schemaClass !== User)
			throw new Error("controller() should store schema class");
		if (testController.routes.length !== 1)
			throw new Error("controller() should store routes");

		const beforeCount = this.app.Route.controllerCount;
		this.app.Route.register(testController);
		const afterCount = this.app.Route.controllerCount;

		if (afterCount !== beforeCount + 1) {
			throw new Error(
				`Expected controllerCount to increase by 1, got ${afterCount} (was ${beforeCount})`,
			);
		}

		console.log("   - Controller registration works correctly");
	}

	// --- HTTP pipeline test ---
	private async testHttpPipeline(): Promise<void> {
		const port = 3457;
		const app = express();
		const adapter = new ExpressRouteAdapter(app);

		const testCtrl = controller(User, [
			get("/ctrl/health", async () => ({ status: "ok" })),
			get("/ctrl/echo/:id", async (ctx) => ({ id: ctx.request.params.id })),
			get("/ctrl/query-test", async (ctx) => ({ q: ctx.request.query.q })),
			post("/ctrl/echo-body", async (ctx) => ({ received: ctx.request.body })),
		]);

		this.app.Route.register(testCtrl);
		this.app.Route.connect(adapter);

		const server = await new Promise<http.Server>((resolve) => {
			const s = app.listen(port, () => resolve(s));
		});

		try {
			// GET /ctrl/health
			const res = await httpGet(`http://localhost:${port}/ctrl/health`);
			assertStatus(res, 200);
			const data = parseBody(res.body);
			if (data.type !== "data" || data.data.status !== "ok") {
				throw new Error(`/ctrl/health unexpected response: ${res.body}`);
			}
			console.log("   - GET /ctrl/health passed");

			// GET /ctrl/echo/:id (path params)
			const echoRes = await httpGet(`http://localhost:${port}/ctrl/echo/42`);
			assertStatus(echoRes, 200);
			const echoData = parseBody(echoRes.body);
			if (echoData.data.id !== "42") {
				throw new Error(`/ctrl/echo/:id unexpected: ${echoRes.body}`);
			}
			console.log("   - GET /ctrl/echo/:id (path params) passed");

			// GET /ctrl/query-test (query params)
			const queryRes = await httpGet(
				`http://localhost:${port}/ctrl/query-test?q=hello`,
			);
			assertStatus(queryRes, 200);
			const queryData = parseBody(queryRes.body);
			if (queryData.data.q !== "hello") {
				throw new Error(`/ctrl/query-test unexpected: ${queryRes.body}`);
			}
			console.log("   - GET /ctrl/query-test (query params) passed");

			// POST /ctrl/echo-body (JSON body parsing)
			const postRes = await httpPost(
				`http://localhost:${port}/ctrl/echo-body`,
				{ name: "test", count: 42 },
			);
			assertStatus(postRes, 200);
			const postData = parseBody(postRes.body);
			if (
				postData.data.received.name !== "test" ||
				postData.data.received.count !== 42
			) {
				throw new Error(`/ctrl/echo-body unexpected: ${postRes.body}`);
			}
			console.log("   - POST /ctrl/echo-body (JSON parsing) passed");
		} finally {
			server.close();
		}
	}

	// --- Error handler test ---
	private async testErrorHandler(): Promise<void> {
		const port = 3458;
		const app = express();
		const adapter = new ExpressRouteAdapter(app);

		const testCtrl = controller(User, [
			get("/ctrl/error", async () => {
				throw new Error("Something went wrong");
			}),
			get("/ctrl/not-found", async () => {
				throw new Error("User not found");
			}),
		]);

		this.app.Route.register(testCtrl);
		this.app.Route.connect(adapter);

		const server = await new Promise<http.Server>((resolve) => {
			const s = app.listen(port, () => resolve(s));
		});

		try {
			// GET /ctrl/error → 500 with error message
			const errRes = await httpGet(`http://localhost:${port}/ctrl/error`);
			if (errRes.status !== 500) {
				throw new Error(`/ctrl/error should return 500, got ${errRes.status}`);
			}
			const errData = parseBody(errRes.body);
			if (
				errData.type !== "error" ||
				errData.message !== "Something went wrong"
			) {
				throw new Error(`/ctrl/error unexpected response: ${errRes.body}`);
			}
			console.log("   - Error handler returns 500 with message");

			// GET /ctrl/not-found → 500
			const nfRes = await httpGet(`http://localhost:${port}/ctrl/not-found`);
			if (nfRes.status !== 500) {
				throw new Error(
					`/ctrl/not-found should return 500, got ${nfRes.status}`,
				);
			}
			const nfData = parseBody(nfRes.body);
			if (nfData.message !== "User not found") {
				throw new Error(`/ctrl/not-found unexpected: ${nfRes.body}`);
			}
			console.log("   - Not found error returns 500");
		} finally {
			server.close();
		}
	}

	// --- Middleware test ---
	private async testMiddleware(): Promise<void> {
		const port = 3459;
		const app = express();
		const adapter = new ExpressRouteAdapter(app);

		const beforeCalls: string[] = [];
		const afterCalls: string[] = [];

		const authMiddleware: RouteMiddleware<User> = async (ctx) => {
			beforeCalls.push("auth");
			// Simulate auth check — could throw to block
		};

		const logAfter: RouteMiddleware<User> = async (ctx) => {
			afterCalls.push("log");
		};

		const blockingMiddleware: RouteMiddleware<User> = async () => {
			throw new Error("Access denied");
		};

		const testCtrl = controller(User, [
			get(
				"/ctrl/middleware-ok",
				{
					before: [authMiddleware],
					after: [logAfter],
				},
				async () => ({ ok: true }),
			),
			get(
				"/ctrl/blocked",
				{
					before: [blockingMiddleware],
				},
				async () => ({ ok: true }),
			),
		]);

		this.app.Route.register(testCtrl);
		this.app.Route.connect(adapter);

		const server = await new Promise<http.Server>((resolve) => {
			const s = app.listen(port, () => resolve(s));
		});

		try {
			// GET /ctrl/middleware-ok — before and after should run
			const res = await httpGet(`http://localhost:${port}/ctrl/middleware-ok`);
			assertStatus(res, 200);
			if (beforeCalls.length !== 1 || beforeCalls[0] !== "auth") {
				throw new Error("Before middleware not called");
			}
			if (afterCalls.length !== 1 || afterCalls[0] !== "log") {
				throw new Error("After middleware not called");
			}
			console.log("   - Before/after middleware executed");

			// GET /ctrl/blocked — blocking middleware should prevent handler execution
			const blockedRes = await httpGet(`http://localhost:${port}/ctrl/blocked`);
			if (blockedRes.status !== 500) {
				throw new Error(
					`/ctrl/blocked should return 500, got ${blockedRes.status}`,
				);
			}
			const blockedData = parseBody(blockedRes.body);
			if (blockedData.message !== "Access denied") {
				throw new Error(`/ctrl/blocked unexpected: ${blockedRes.body}`);
			}
			console.log("   - Blocking middleware prevents handler execution");
		} finally {
			server.close();
		}
	}

	// --- PATCH method test ---
	private async testPatchMethod(): Promise<void> {
		const port = 3460;
		const app = express();
		const adapter = new ExpressRouteAdapter(app);

		const testCtrl = controller(User, [
			patch("/ctrl/partial-update", { transactional: true }, async (ctx) => ({
				updated: ctx.request.body,
			})),
		]);

		this.app.Route.register(testCtrl);
		this.app.Route.connect(adapter);

		const server = await new Promise<http.Server>((resolve) => {
			const s = app.listen(port, () => resolve(s));
		});

		try {
			const patchRes = await httpPatch(
				`http://localhost:${port}/ctrl/partial-update`,
				{ first_name: "Updated" },
			);
			assertStatus(patchRes, 200);
			const patchData = parseBody(patchRes.body);
			if (patchData.data.updated.first_name !== "Updated") {
				throw new Error(`/ctrl/partial-update unexpected: ${patchRes.body}`);
			}
			console.log("   - PATCH method works");
		} finally {
			server.close();
		}
	}
}

// --- Helpers ---

function assertStatus(res: { status: number }, expected: number): void {
	if (res.status !== expected) {
		throw new Error(`Expected status ${expected}, got ${res.status}`);
	}
}

function parseBody(body: string): any {
	return JSON.parse(body);
}

function httpGet(url: string): Promise<{ status: number; body: string }> {
	return new Promise((resolve, reject) => {
		http
			.get(url, (res: http.IncomingMessage) => {
				let body = "";
				res.on("data", (chunk: string) => (body += chunk));
				res.on("end", () => resolve({ status: res.statusCode || 0, body }));
			})
			.on("error", reject);
	});
}

function httpPost(
	url: string,
	data: object,
): Promise<{ status: number; body: string }> {
	return httpMethod("POST", url, data);
}

function httpPatch(
	url: string,
	data: object,
): Promise<{ status: number; body: string }> {
	return httpMethod("PATCH", url, data);
}

function httpMethod(
	method: string,
	url: string,
	data: object,
): Promise<{ status: number; body: string }> {
	return new Promise((resolve, reject) => {
		const urlObj = new URL(url);
		const req = http.request(
			{
				hostname: urlObj.hostname,
				port: Number(urlObj.port),
				path: urlObj.pathname,
				method,
				headers: { "Content-Type": "application/json" },
			},
			(res: http.IncomingMessage) => {
				let body = "";
				res.on("data", (chunk: string) => (body += chunk));
				res.on("end", () => resolve({ status: res.statusCode || 0, body }));
			},
		);
		req.on("error", reject);
		req.write(JSON.stringify(data));
		req.end();
	});
}
