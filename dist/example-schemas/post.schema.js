"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postSchema = void 0;
const init_1 = require("../schema/init");
const audit_feature_1 = require("../features/audit.feature");
const revisions_feature_1 = require("../features/revisions.feature");
// 1. Define the schema object for a blog post.
exports.postSchema = (0, init_1.schema)({
    collection: "post",
    version: "0.1",
    primary: (0, init_1.primary)({
        name: "id",
        label: "ID",
        db_type: "number",
        auto_increment: true,
    }),
    form: (0, init_1.form)({
        sections: [
            init_1.sections.block({
                key: "main",
                title: "Содержимое поста",
                fields: [
                    (0, init_1.string)({
                        name: "title",
                        label: "Заголовок поста",
                        required: true,
                    }),
                    (0, init_1.string)({
                        name: "content",
                        label: "Содержимое",
                        required: false,
                    }),
                    (0, init_1.boolean)({
                        name: "is_published",
                        label: "Опубликовано",
                        default: false,
                        variant: "switch",
                    }),
                    // This is the foreign key relationship to the 'user' collection.
                    (0, init_1.ref)({
                        name: "author_id",
                        label: "Автор",
                        ref: "user", // This must match the 'collection' name in user.schema.ts
                        required: true,
                    }),
                    (0, init_1.datetime)({
                        // Using the refactored datetime builder
                        name: "published_at",
                        label: "Дата публикации",
                        required: false,
                        db: { nullable: true },
                    }),
                ],
                actions: [
                    (0, init_1.action)({
                        name: "save",
                        label: "Сохранить",
                        source: ":id/save",
                    }),
                ],
            }),
        ],
    }),
    features: [audit_feature_1.AuditFeature, revisions_feature_1.RevisionsFeature],
});
// Schema is now discovered and initialized by KadmiumApp.
//# sourceMappingURL=post.schema.js.map