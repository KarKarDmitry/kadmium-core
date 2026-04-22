"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tc20_postSchema = void 0;
const init_1 = require("../schema/init");
exports.tc20_postSchema = (0, init_1.schema)({
    collection: "tc20_post",
    version: "0.1",
    primary: (0, init_1.primary)({
        name: "id",
        label: "ID",
        db_type: "uuid",
    }),
    form: (0, init_1.form)({
        sections: [
            init_1.sections.block({
                key: "main",
                fields: [
                    (0, init_1.string)({
                        name: "title",
                        label: "Title",
                        required: true,
                    }),
                    (0, init_1.ref)({
                        name: "author_id",
                        label: "Author",
                        ref: "tc20_user",
                        required: true,
                    }),
                    (0, init_1.boolean)({
                        name: "is_published",
                        label: "Published",
                        default: false,
                    }),
                ],
            }),
        ],
    }),
});
//# sourceMappingURL=tc20-post.schema.js.map