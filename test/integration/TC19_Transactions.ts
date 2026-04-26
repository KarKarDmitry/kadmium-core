import * as http from 'http';
import express from 'express';
import { IntegrationTestCase } from '../types/IntegrationTestCase';
import { KadmiumApp } from '../../src/kadmium-app';
import { User } from '../../src/models/schemas/User';
import { Post } from '../../src/models/schemas/Post';
import { controller, get, post } from '../../src/controller/init';
import { ExpressRouteAdapter } from '../../src/route/adapters/rest.adapter';
import { v } from '../../src/validation';

export class TC19_Transactions extends IntegrationTestCase {
    private port = 3461;
    private expressApp!: express.Application;
    private adapter!: ExpressRouteAdapter;
    private server!: http.Server;

    constructor(app: KadmiumApp) {
        super(app, 'Transactions (Controller + Repo)');
    }

    protected async runImpl(): Promise<void> {
        await this.testRepoTransactionCommit();
        await this.testRepoTransactionRollback();
        await this.testRepoMultiRepoTransaction();
        await this.testControllerTransactionalRoute();
        await this.teardownExpress();
        await this.testControllerRollbackOnError();
        await this.teardownExpress();
        await this.testControllerNonTransactional();
        await this.teardownExpress();
    }

    /* ── Repo-level: transaction commit ── */
    private async testRepoTransactionCommit(): Promise<void> {
        const userRepo = this.app.Repo.get(User);

        const email = `tx-commit-${Date.now()}@example.com`;
        const username = `txcommit${Date.now()}`;

        const result = await userRepo.transaction(async (tx) => {
            const txUserRepo = tx.get(User);
            return txUserRepo
                .create({
                    first_name: 'TxCommit',
                    last_name: 'Test',
                    email,
                    username,
                    password: 'txtestpassword123',
                })
                .go();
        });

        if (!result.id) throw new Error('Expected user id from transaction');

        // Verify user exists in DB
        const found = await userRepo
            .where((e) => e.email.eq(email))
            .first()
            .go();
        if (!found || found.first_name !== 'TxCommit') {
            throw new Error('User created in transaction was not committed');
        }

        // Cleanup
        await userRepo
            .delete()
            .where((e) => e.email.eq(email))
            .go();

        console.log('   - Repo transaction commit: user created and persisted');
    }

    /* ── Repo-level: transaction rollback on error ── */
    private async testRepoTransactionRollback(): Promise<void> {
        const userRepo = this.app.Repo.get(User);

        const email = `tx-rollback-${Date.now()}@example.com`;
        const username = `txrollback${Date.now()}`;

        try {
            await userRepo.transaction(async (tx) => {
                const txUserRepo = tx.get(User);
                await txUserRepo
                    .create({
                        first_name: 'TxRollback',
                        last_name: 'Test',
                        email,
                        username,
                        password: 'txtestpassword123',
                    })
                    .go();
                throw new Error('Intentional rollback error');
            });
            throw new Error('Transaction should have thrown');
        } catch (err) {
            if ((err as Error).message !== 'Intentional rollback error') {
                throw err;
            }
        }

        // Verify user does NOT exist in DB
        const found = await userRepo
            .where((e) => e.email.eq(email))
            .first()
            .go();
        if (found) {
            throw new Error(
                'User created in failed transaction was committed (should be rolled back)',
            );
        }

        console.log(
            '   - Repo transaction rollback: user NOT persisted after error',
        );
    }

    /* ── Repo-level: multi-repo transaction ── */
    private async testRepoMultiRepoTransaction(): Promise<void> {
        const userRepo = this.app.Repo.get(User);
        const postRepo = this.app.Repo.get(Post);

        const email = `tx-multi-${Date.now()}@example.com`;
        const username = `txmulti${Date.now()}`;

        const result = await userRepo.transaction(async (tx) => {
            const txUserRepo = tx.get(User);
            const txPostRepo = tx.get(Post);

            const user = await txUserRepo
                .create({
                    first_name: 'TxMulti',
                    last_name: 'Test',
                    email,
                    username,
                    password: 'txtestpassword123',
                })
                .go();

            const post = await txPostRepo
                .create({
                    title: 'Tx Multi Post',
                    author_id: user.id,
                    is_published: false,
                })
                .go();

            return { user, post };
        });

        if (!result.user.id || !result.post.id) {
            throw new Error('Expected ids from multi-repo transaction');
        }

        // Verify both exist
        const foundUser = await userRepo
            .where((e) => e.email.eq(email))
            .first()
            .go();
        const foundPost = await postRepo
            .where((e) => e.title.eq('Tx Multi Post'))
            .first()
            .go();
        if (!foundUser || !foundPost) {
            throw new Error(
                'Multi-repo transaction did not commit both records',
            );
        }

        // Cleanup
        await postRepo
            .delete()
            .where((e) => e.title.eq('Tx Multi Post'))
            .go();
        await userRepo
            .delete()
            .where((e) => e.email.eq(email))
            .go();

        console.log(
            '   - Repo multi-repo transaction: both user and post committed',
        );
    }

    /* ── Controller-level: transactional route ── */
    private async testControllerTransactionalRoute(): Promise<void> {
        const email = `ctrl-tx-${Date.now()}@example.com`;
        const username = `ctrltx${Date.now()}`;

        this.setupExpress();

        const testCtrl = controller(User, [
            post(
                '/ctrl/tx-create',
                {
                    validation: {
                        body: {
                            first_name: v.string.min(1),
                            last_name: v.string.min(1),
                            email: v.email,
                            username: v.string.min(1),
                            password: v.string.min(8),
                        },
                    },
                },
                async (ctx, req) => {
                    return ctx.repo.create(req.body).go();
                },
            ),
        ]);

        this.app.Route.register(testCtrl);
        this.app.Route.connect(this.adapter);

        const res = await httpPost(
            `http://localhost:${this.port}/ctrl/tx-create`,
            {
                first_name: 'CtrlTx',
                last_name: 'Test',
                email,
                username,
                password: 'ctrltxpassword123',
            },
        );

        if (res.status !== 200) {
            throw new Error(`Expected 200, got ${res.status}: ${res.body}`);
        }

        const data = JSON.parse(res.body);
        if (data.type !== 'data' || !data.data.id) {
            throw new Error(`Unexpected response: ${res.body}`);
        }

        // Verify user in DB
        const userRepo = this.app.Repo.get(User);
        const found = await userRepo
            .where((e) => e.email.eq(email))
            .first()
            .go();
        if (!found || found.first_name !== 'CtrlTx') {
            throw new Error(
                'User from transactional controller was not committed',
            );
        }

        // Cleanup
        await userRepo
            .delete()
            .where((e) => e.email.eq(email))
            .go();

        console.log('   - Controller transactional route: user committed');
    }

    /* ── Controller-level: rollback on error ── */
    private async testControllerRollbackOnError(): Promise<void> {
        const email = `ctrl-rollback-${Date.now()}@example.com`;
        const username = `ctrlrollback${Date.now()}`;

        this.setupExpress();

        const testCtrl = controller(User, [
            post(
                '/ctrl/tx-fail',
                {
                    validation: {
                        body: {
                            first_name: v.string.min(1),
                            last_name: v.string.min(1),
                            email: v.email,
                            username: v.string.min(1),
                            password: v.string.min(8),
                        },
                    },
                },
                async (ctx, req) => {
                    const user = await ctx.repo.create(req.body).go();
                    throw new Error('Handler error — should rollback');
                },
            ),
        ]);

        this.app.Route.register(testCtrl);
        this.app.Route.connect(this.adapter);

        const res = await httpPost(
            `http://localhost:${this.port}/ctrl/tx-fail`,
            {
                first_name: 'CtrlRollback',
                last_name: 'Test',
                email,
                username,
                password: 'ctrltxpassword123',
            },
        );

        if (res.status !== 500) {
            throw new Error(`Expected 500, got ${res.status}: ${res.body}`);
        }

        const data = JSON.parse(res.body);
        if (
            data.type !== 'error' ||
            data.message !== 'Handler error — should rollback'
        ) {
            throw new Error(`Unexpected error response: ${res.body}`);
        }

        // Verify user NOT in DB
        const userRepo = this.app.Repo.get(User);
        const found = await userRepo
            .where((e) => e.email.eq(email))
            .first()
            .go();
        if (found) {
            throw new Error(
                'User from failed controller was committed (should be rolled back)',
            );
        }

        console.log('   - Controller rollback: user NOT persisted after error');
    }

    /* ── Controller-level: non-transactional route ── */
    private async testControllerNonTransactional(): Promise<void> {
        this.setupExpress();

        const testCtrl = controller(User, [
            get('/ctrl/non-tx', { transactional: false }, async (ctx) => {
                const users = await ctx.repo.select().go();
                return { count: users.length };
            }),
        ]);

        this.app.Route.register(testCtrl);
        this.app.Route.connect(this.adapter);

        const res = await httpGet(`http://localhost:${this.port}/ctrl/non-tx`);
        if (res.status !== 200) {
            throw new Error(`Expected 200, got ${res.status}: ${res.body}`);
        }

        const data = JSON.parse(res.body);
        if (data.type !== 'data' || typeof data.data.count !== 'number') {
            throw new Error(`Unexpected response: ${res.body}`);
        }

        console.log(
            '   - Controller non-transactional route: works without transaction',
        );
    }

    /* ── Setup helpers ── */
    private setupExpress(): void {
        this.expressApp = express();
        this.adapter = new ExpressRouteAdapter(this.expressApp);
        this.server = this.expressApp.listen(this.port);
    }

    private teardownExpress(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    // Give PostgreSQL time to fully release the connection
                    setTimeout(resolve, 500);
                });
            } else {
                resolve();
            }
        });
    }
}

/* ── HTTP helpers ── */

function httpGet(url: string): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => resolve({ status: res.statusCode || 0, body }));
        }).on('error', reject);
    });
}

function httpPost(
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
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            },
            (res) => {
                let body = '';
                res.on('data', (chunk) => (body += chunk));
                res.on('end', () =>
                    resolve({ status: res.statusCode || 0, body }),
                );
            },
        );
        req.on('error', reject);
        req.write(JSON.stringify(data));
        req.end();
    });
}
