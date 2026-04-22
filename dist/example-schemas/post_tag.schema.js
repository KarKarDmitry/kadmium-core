"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postTagSchema = void 0;
const init_1 = require("../schema/init");
exports.postTagSchema = (0, init_1.schema)({
    collection: "post_tag",
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
                title: "Post-Tag Link",
                fields: [
                    (0, init_1.ref)({
                        name: "post_id",
                        label: "Post",
                        ref: "post",
                        required: true,
                    }),
                    (0, init_1.ref)({
                        name: "tag_id",
                        label: "Tag",
                        ref: "tag",
                        required: true,
                    }),
                ],
            }),
        ],
    }),
});
//# sourceMappingURL=post_tag.schema.js.map