import { Model, ModelConfig } from "../../model/init";
import { PUBLIC_TYPE_SYMBOL, RELATIONS_SYMBOL } from "../../repo/symbols";
import { ToManyRelation } from "../../repo/types/relations";
import { User } from "./User";
export type DepartmentSensitiveFields = never;
export type DepartmentPublic = Department;
type __DepartmentRelations = {
    users: ToManyRelation<User>;
};
export declare class Department extends Model {
    static readonly _collection = "department";
    _meta: "generated-schema";
    [PUBLIC_TYPE_SYMBOL]: DepartmentPublic;
    [RELATIONS_SYMBOL]: __DepartmentRelations;
    id: number;
    name: string;
    _conf_: ModelConfig<this>;
}
export {};
//# sourceMappingURL=Department.d.ts.map