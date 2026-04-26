import { KadmiumFeature, FeatureHooks } from './types/base.feature.js';
import { HookContext } from './types/index.js';
import { datetime } from '../schema/dsl.js';
import { FeatureModel } from '../model/types.js';
import { AnyModel, Model } from '../model/model.js';

abstract class AuditAmend extends Model {
    created_at!: Date;
    updated_at!: Date;
}

/**
 * AuditFeature — автоматически заполняет audit-поля.
 *
 * 1. Добавляет created_at и updated_at через amendSchema()
 * 2. Устанавливает created_at + updated_at при создании записи
 * 3. Обновляет updated_at при изменении записи
 *
 * Использование в схеме:
 *   features: [AuditFeature],
 */
export class AuditFeature extends KadmiumFeature {
    amendSchema() {
        return {
            fields: [
                datetime({
                    name: 'created_at',
                    label: 'Created At',
                    required: false,
                    db: { nullable: true, index: true },
                }),
                datetime({
                    name: 'updated_at',
                    label: 'Updated At',
                    required: false,
                    db: { nullable: true, index: true },
                }),
            ],
        };
    }

    hooks: FeatureHooks<AuditAmend> = {
        beforeCreate: [
            (ctx) => {
                const now = new Date();
                if (!ctx.getData('created_at')) {
                    ctx.setData('created_at', now);
                }
                if (!ctx.getData('updated_at')) {
                    ctx.setData('updated_at', now);
                }
            },
        ],
        beforeUpdate: [
            (ctx) => {
                ctx.setData('updated_at', new Date());
            },
        ],
    };
}
