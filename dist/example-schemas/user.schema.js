"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSchema = void 0;
const init_1 = require("../schema/init");
// 1. Define the schema object
exports.userSchema = (0, init_1.schema)({
    collection: "user",
    version: "0.1",
    primary: (0, init_1.primary)({
        name: "id",
        label: "ID",
        db_type: "uuid",
    }),
    form: (0, init_1.form)({
        sections: [
            init_1.sections.inline_block({
                key: "main",
                title: "User",
                fields: [
                    (0, init_1.string)({
                        name: "first_name",
                        label: "First Name",
                        required: true,
                    }),
                    (0, init_1.string)({
                        name: "last_name",
                        label: "Last Name",
                        required: true,
                    }),
                    (0, init_1.string)({
                        name: "middle_name",
                        label: "Middle Name",
                        required: false, // optional
                        db: { nullable: true }, // and nullable
                    }),
                    (0, init_1.ref)({
                        name: "department_id",
                        label: "Department",
                        ref: "department",
                        required: false,
                        db: { nullable: true },
                    }),
                    (0, init_1.email)({
                        name: "email",
                        label: "Email",
                        required: true,
                        db: { unique: true, index: true, nullable: false },
                    }),
                ],
                actions: [
                    (0, init_1.action_group)({
                        label: "Действия",
                        name: "user_actions",
                        position: "sticky",
                        actions: [
                            (0, init_1.action)({
                                name: "save",
                                label: "Сохранить",
                                hint: "Требуются права администратора",
                                source: ":id/save",
                            }),
                            (0, init_1.action)({
                                name: "create",
                                label: "Создать",
                                hint: "Требуются права администратора",
                                source: "create",
                            }),
                            (0, init_1.action)({
                                name: "report",
                                label: "Отчет по пользователю",
                                hint: "Показ статистики пользователя",
                                source: ":id/report",
                            }),
                            (0, init_1.href)({
                                name: "account",
                                label: "Перейти к аккаунту",
                                href: "/account/:id",
                            }),
                        ],
                    }),
                    (0, init_1.action)({
                        name: "delete",
                        label: "Удалить",
                        hint: "Удалить пользователя",
                        source: ":id/delete",
                    }),
                ],
            }),
            init_1.sections.block({
                key: "login_settings",
                title: "Login settings",
                fields: [
                    (0, init_1.string)({
                        name: "username",
                        label: "Username",
                        required: true,
                        db: { unique: true, index: true },
                    }),
                    (0, init_1.password)({
                        name: "password",
                        label: "Password",
                        required: true,
                        min: 8,
                    }),
                    (0, init_1.password)({
                        name: "confirm_password",
                        label: "Confirm password",
                        required: true,
                        min: 8,
                        persist: false,
                    }),
                ],
            }),
        ],
    }),
});
//# sourceMappingURL=user.schema.js.map