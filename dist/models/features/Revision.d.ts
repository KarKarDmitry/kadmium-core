import { Model, ModelConfig } from "../../model/init";
import { PUBLIC_TYPE_SYMBOL, RELATIONS_SYMBOL } from "../../repo/symbols";
import { ToOneRelation } from "../../repo/types/relations";
import { User } from "../schemas/User";
export type RevisionSensitiveFields = never;
export type RevisionPublic = Revision;
type __RevisionRelations = {
    changed_by: ToOneRelation<User>;
};
export declare class Revision extends Model {
    static readonly _collection = "revision";
    _meta: "generated-schema";
    [PUBLIC_TYPE_SYMBOL]: RevisionPublic;
    [RELATIONS_SYMBOL]: __RevisionRelations;
    id: number;
    target_table: string;
    target_id: string;
    data: any | null;
    changed_fields: string | null;
    changed_at: Date | null;
    changed_by: string | null;
    _conf_: ModelConfig<this>;
}
export {};
//# sourceMappingURL=Revision.d.ts.map