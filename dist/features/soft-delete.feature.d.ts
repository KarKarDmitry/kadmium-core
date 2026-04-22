import { KadmiumFeature, FeatureHooks } from "./types/base.feature";
import { AnyModel } from "../model/model";
declare abstract class SoftDeleteAmend extends AnyModel {
    deleted_at: Date | null;
}
/**
 * SoftDeleteFeature — мягкое удаление записей.
 *
 * Вместо физического удаления устанавливает `deleted_at`.
 * Автоматически фильтрует удалённые записи из select-запросов.
 *
 * Использование в схеме:
 *   features: [SoftDeleteFeature],
 */
export declare class SoftDeleteFeature extends KadmiumFeature {
    priority: number;
    amendSchema(): {
        fields: import("../schema/types/fields").DateTime_OPT[];
    };
    hooks: FeatureHooks<SoftDeleteAmend>;
}
export {};
//# sourceMappingURL=soft-delete.feature.d.ts.map