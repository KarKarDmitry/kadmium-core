import { schema, form, primary, string, sections as s } from '../schema/dsl.js';
import { RevisionsFeature } from '../features/revisions.feature.js';

export const departmentSchema = schema({
    collection: 'department',
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
                title: 'Department',
                fields: [
                    string({
                        name: 'name',
                        label: 'Department Name',
                        required: true,
                        db: { unique: true },
                    }),
                ],
            }),
        ],
    }),
    features: [RevisionsFeature],
});
