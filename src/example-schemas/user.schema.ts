import {
    schema,
    form,
    string,
    password,
    email,
    sections as s,
    action_group,
    action,
    href,
    primary,
    ref,
} from '../schema/dsl.js';

// 1. Define the schema object
export const userSchema = schema({
    collection: 'user',
    version: '0.1',
    primary: primary({
        name: 'id',
        label: 'ID',
        db_type: 'uuid',
    }),
    form: form({
        sections: [
            s.inline_block({
                key: 'main',
                title: 'User',
                fields: [
                    string({
                        name: 'first_name',
                        label: 'First Name',
                        required: true,
                    }),
                    string({
                        name: 'last_name',
                        label: 'Last Name',
                        required: true,
                    }),
                    string({
                        name: 'middle_name',
                        label: 'Middle Name',
                        required: false, // optional
                        db: { nullable: true }, // and nullable
                    }),
                    ref({
                        name: 'department_id',
                        label: 'Department',
                        ref: 'department',
                        required: false,
                        db: { nullable: true },
                    }),
                    email({
                        name: 'email',
                        label: 'Email',
                        required: true,
                        db: { unique: true, index: true, nullable: false },
                    }),
                ],
                actions: [
                    action_group({
                        label: 'Действия',
                        name: 'user_actions',
                        position: 'sticky',
                        actions: [
                            action({
                                name: 'save',
                                label: 'Сохранить',
                                hint: 'Требуются права администратора',
                                source: ':id/save',
                            }),
                            action({
                                name: 'create',
                                label: 'Создать',
                                hint: 'Требуются права администратора',
                                source: 'create',
                            }),
                            action({
                                name: 'report',
                                label: 'Отчет по пользователю',
                                hint: 'Показ статистики пользователя',
                                source: ':id/report',
                            }),
                            href({
                                name: 'account',
                                label: 'Перейти к аккаунту',
                                href: '/account/:id',
                            }),
                        ],
                    }),
                    action({
                        name: 'delete',
                        label: 'Удалить',
                        hint: 'Удалить пользователя',
                        source: ':id/delete',
                    }),
                ],
            }),
            s.block({
                key: 'login_settings',
                title: 'Login settings',
                fields: [
                    string({
                        name: 'username',
                        label: 'Username',
                        required: true,
                        db: { unique: true, index: true },
                    }),
                    password({
                        name: 'password',
                        label: 'Password',
                        required: true,
                        min: 8,
                    }),
                    password({
                        name: 'confirm_password',
                        label: 'Confirm password',
                        required: true,
                        min: 8,
                        persist: false,
                    }),
                ],
            }),
        ],
    }),
});
