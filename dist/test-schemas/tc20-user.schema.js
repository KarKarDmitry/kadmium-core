"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tc20_userSchema = void 0;
const init_1 = require("../schema/init");
exports.tc20_userSchema = (0, init_1.schema)({
    collection: "tc20_user",
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
                        name: "name",
                        label: "Name",
                        required: true,
                    }),
                    (0, init_1.string)({
                        name: "email",
                        label: "Email",
                        required: true,
                        db: { unique: true, index: true },
                    }),
                ],
            }),
        ],
    }),
});
//# sourceMappingURL=tc20-user.schema.js.map