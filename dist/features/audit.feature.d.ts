import { KadmiumFeature, FeatureHooks } from "./types/base.feature";
import { Model } from "../model/model";
declare abstract class AuditAmend extends Model {
    created_at: Date;
    updated_at: Date;
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
export declare class AuditFeature extends KadmiumFeature {
    amendSchema(): {
        fields: import("../schema/types/fields").DateTime_OPT[];
    };
    hooks: FeatureHooks<AuditAmend>;
}
export {};
//# sourceMappingURL=audit.feature.d.ts.map