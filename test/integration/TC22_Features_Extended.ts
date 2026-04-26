import * as http from 'http';
import express from 'express';
import { IntegrationTestCase } from '../types/IntegrationTestCase';
import { KadmiumApp } from '../../src/kadmium-app';
import { Comment } from '../../src/models/schemas/Comment';
import { User } from '../../src/models/schemas/User';
import { Post } from '../../src/models/schemas/Post';
import { Department } from '../../src/models/schemas/Department';
import { Revision } from '../../src/models/features/Revision';
import { SoftDeleteFeature } from '../../src/features/soft-delete.feature';
import { RevisionsFeature } from '../../src/features/revisions.feature';
import { ExpressRouteAdapter } from '../../src/route/adapters/rest.adapter';

/**
 * TC22 — тестирование SoftDeleteFeature и RevisionsFeature.
 *
 * Проверяет:
 * 1. SoftDelete — deleted_at добавлен в registry comment
 * 2. SoftDelete — комментарий "удаляется" через update(deleted_at)
 * 3. Revisions — registeredSchemas содержит "department"
 * 4. Revisions — create создаёт запись в revision (через POST)
 * 5. Revisions — update создаёт запись в revision (через PUT)
 * 6. Revisions — GET /revisions/:table/:id возвращает историю
 * 7. Revisions — ensureEnabled бросает ошибку для неподключённой схемы
 */
export class TC22_Features_Extended extends IntegrationTestCase {
    private port = 4891;

    constructor(app: KadmiumApp) {
        super(app, 'SoftDelete & Revisions Features');
    }

    protected async runImpl(): Promise<void> {
        console.log('--- SoftDelete & Revisions Features Tests ---');

        const commentRepo = this.app.Repo.get(Comment);
        const userRepo = this.app.Repo.get(User);
        const postRepo = this.app.Repo.get(Post);
        const deptRepo = this.app.Repo.get(Department);

        // ── 1. SoftDelete — deleted_at добавлен в registry ──
        const commentSchemaCore = this.app.appCore.schemas.find(
            (s) => s.collection === 'comment',
        );
        if (!commentSchemaCore) throw new Error('1. Comment schema not found.');
        if (
            !commentSchemaCore.features.some(
                (f) => f instanceof SoftDeleteFeature,
            )
        )
            throw new Error('1. Comment has no SoftDeleteFeature.');
        if (!commentSchemaCore.registry.fieldsByName.has('deleted_at'))
            throw new Error('1. deleted_at not in comment registry.');
        console.log(
            '1. SoftDelete: deleted_at field added to comment registry.',
        );

        // ── 2. SoftDelete — мягкое удаление комментария через .delete() ──
        const testUser = await userRepo
            .create({
                first_name: 'SoftDel',
                last_name: 'Test',
                email: `softdel.${Date.now()}@example.com`,
                username: `softdel${Date.now()}`,
                password: 'securepassword',
                confirm_password: 'securepassword',
            })
            .go();

        const testPost = await postRepo
            .create({
                title: 'SoftDel Post',
                author_id: testUser.id,
                is_published: false,
            })
            .go();

        const testComment = await commentRepo
            .create({
                body: 'Test comment for soft delete',
                post_id: testPost.id,
                user_id: testUser.id,
            })
            .go();

        if ((testComment as any).deleted_at)
            throw new Error('2. New comment should not have deleted_at.');

        const beforeDelete = Date.now();
        // Теперь .delete() автоматически вызывает beforeDelete хук который делает soft-delete
        await commentRepo
            .where((c) => c.id.eq(testComment.id))
            .delete()
            .go();

        // beforeRead добавляет deleted_at IS NULL, поэтому обычный select не найдёт удалённую запись
        const deletedByNormalSelect = await commentRepo
            .where((c) => c.id.eq(testComment.id))
            .first({ includeSecured: true })
            .go();

        if (deletedByNormalSelect)
            throw new Error(
                '2. Deleted comment should NOT be found by normal select (beforeRead filter).',
            );

        // Проверяем через raw SQL что запись всё ещё существует и имеет deleted_at
        const rawResult: any[] = await this.app.Repo.raw(
            `SELECT * FROM "comment" WHERE id = $1`,
            [testComment.id],
        ).go();

        if (rawResult.length === 0)
            throw new Error(
                '2. Comment should still exist in DB (soft delete).',
            );
        if (!rawResult[0]?.deleted_at)
            throw new Error(
                '2. Comment should have deleted_at after soft delete.',
            );

        const deletedAtMs = new Date(rawResult[0].deleted_at).getTime();
        if (deletedAtMs < beforeDelete - 5000)
            throw new Error('2. deleted_at timestamp is out of range.');
        console.log(
            '2. SoftDelete: comment soft-deleted successfully (not found by select, but exists in DB).',
        );

        // ── 3. Revisions — registeredSchemas содержит "department" ──
        if (!RevisionsFeature.registeredSchemas.has('department'))
            throw new Error(
                '3. department not in RevisionsFeature.registeredSchemas.',
            );
        console.log('3. Revisions: department registered.');

        // ── 4-6. Тестирование через HTTP ручку ──
        const expressApp = express();
        expressApp.use(express.json());
        const adapter = new ExpressRouteAdapter(expressApp);
        this.app.Route.connect(adapter);

        const server = await new Promise<http.Server>((resolve) => {
            const s = expressApp.listen(this.port, () => resolve(s));
        });

        let dept: Department;

        try {
            // ── 4. Create department и проверяем ревизию ──
            dept = await deptRepo
                .create({ name: `Revisions Dept ${Date.now()}` })
                .go();

            await new Promise((r) => setTimeout(r, 200));

            const res1 = await httpGet(
                `http://localhost:${this.port}/revisions/department/${dept.id}`,
            );
            if (res1.statusCode !== 200)
                throw new Error(
                    `4. GET /revisions failed with ${res1.statusCode}`,
                );
            const body1 = JSON.parse(res1.body);
            if (body1.type !== 'data' || body1.data.length === 0)
                throw new Error(
                    '4. No revisions found after department create.',
                );
            console.log(
                `4. Revisions: GET returned ${body1.data.length} revision(s) after create.`,
            );

            // ── 5. Update department и проверяем вторую ревизию ──
            await deptRepo
                .where((d) => d.id.eq(dept.id))
                .update({ name: `Updated Dept ${Date.now()}` })
                .go();

            await new Promise((r) => setTimeout(r, 200));

            const res2 = await httpGet(
                `http://localhost:${this.port}/revisions/department/${dept.id}`,
            );
            const body2 = JSON.parse(res2.body);
            if (body2.data.length < 2)
                throw new Error(
                    `5. Expected >= 2 revisions, got ${body2.data.length}.`,
                );
            console.log(
                `5. Revisions: GET returned ${body2.data.length} revision(s) after update.`,
            );

            // ── 6. ensureEnabled — ошибка для неизвестной схемы ──
            const res3 = await httpGet(
                `http://localhost:${this.port}/revisions/nonexistent/123`,
            );
            if (res3.statusCode !== 400)
                throw new Error(
                    `6. Expected 400 for unknown schema, got ${res3.statusCode}`,
                );
            const body3 = JSON.parse(res3.body);
            if (!body3.message?.includes('не подключены'))
                throw new Error(`6. Wrong error message: ${body3.message}`);
            console.log('6. Revisions: 400 for unknown schema as expected.');
        } finally {
            server.close();
        }

        console.log('--- SoftDelete & Revisions Features Tests PASSED ---');
    }
}

// ── HTTP helpers ──

function httpGet(url: string): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () =>
                resolve({ statusCode: res.statusCode || 0, body }),
            );
        }).on('error', reject);
    });
}
