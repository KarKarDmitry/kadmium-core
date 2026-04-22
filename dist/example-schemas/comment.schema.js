"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentSchema = void 0;
const init_1 = require("../schema/init");
const soft_delete_feature_1 = require("../features/soft-delete.feature");
exports.commentSchema = (0, init_1.schema)({
    collection: "comment",
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
                title: "Comment",
                fields: [
                    (0, init_1.string)({
                        name: "body",
                        label: "Comment Body",
                        required: true,
                    }),
                    (0, init_1.ref)({
                        name: "post_id",
                        label: "Post",
                        ref: "post",
                        required: true,
                    }),
                    (0, init_1.ref)({
                        name: "user_id",
                        label: "Author",
                        ref: "user",
                        required: true,
                    }),
                ],
            }),
        ],
    }),
    features: [soft_delete_feature_1.SoftDeleteFeature],
});
//# sourceMappingURL=comment.schema.js.map