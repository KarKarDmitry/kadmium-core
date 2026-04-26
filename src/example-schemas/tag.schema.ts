import { schema, form, primary, string, sections as s } from '../schema/dsl.js';

export const tagSchema = schema({
    collection: 'tag',
    version: '0.1',
    primary: primary({
        name: 'id',
        label: 'ID',
        db_type: 'number',
        auto_increment: true,
    }),
    form: form({
        sections: [
            s.block({
                key: 'main',
                title: 'Tag',
                fields: [
                    string({
                        name: 'name',
                        label: 'Tag Name',
                        required: true,
                        db: { unique: true },
                    }),
                ],
            }),
        ],
    }),
});
