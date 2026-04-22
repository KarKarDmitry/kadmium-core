"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagSchema = void 0;
const init_1 = require("../schema/init");
exports.tagSchema = (0, init_1.schema)({
    collection: "tag",
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
                title: "Tag",
                fields: [
                    (0, init_1.string)({
                        name: "name",
                        label: "Tag Name",
                        required: true,
                        db: { unique: true },
                    }),
                ],
            }),
        ],
    }),
});
//# sourceMappingURL=tag.schema.js.map