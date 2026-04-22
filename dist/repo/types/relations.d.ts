import { AnyModel } from "../../model/model";
import { RELATIONS_SYMBOL } from "../symbols";
export interface RelationMetadata {
    type: "one-to-one" | "many-to-one" | "one-to-many";
    fromSchema: string;
    fromField: string;
    toSchema: string;
    inverseName: string;
}
export type ToOneRelation<T> = T;
export type ToManyRelation<T> = T[];
export type RelationsOf<T> = T extends {
    [RELATIONS_SYMBOL]: infer R;
} ? R : never;
export declare class RelationBase {
}
export declare class ToOneRelationHandle<T extends AnyModel> extends RelationBase {
    private metadata;
    constructor(metadata: RelationMetadata);
}
export declare class ToManyRelationHandle<T extends AnyModel> extends RelationBase {
    private metadata;
    constructor(metadata: RelationMetadata);
}
//# sourceMappingURL=relations.d.ts.map