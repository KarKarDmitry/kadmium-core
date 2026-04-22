"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.departmentSchema = void 0;
const init_1 = require("../schema/init");
const revisions_feature_1 = require("../features/revisions.feature");
exports.departmentSchema = (0, init_1.schema)({
    collection: "department",
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
                title: "Department",
                fields: [
                    (0, init_1.string)({
                        name: "name",
                        label: "Department Name",
                        required: true,
                        db: { unique: true },
                    }),
                ],
            }),
        ],
    }),
    features: [revisions_feature_1.RevisionsFeature],
});
//# sourceMappingURL=department.schema.js.map