import { Model, ModelConfig } from "../../model/init";
import { PUBLIC_TYPE_SYMBOL, RELATIONS_SYMBOL } from "../../repo/symbols";
import { ToManyRelation } from "../../repo/types/relations";
import { Post_tag } from "./Post_tag";
export type TagSensitiveFields = never;
export type TagPublic = Tag;
type __TagRelations = {
    post_tags: ToManyRelation<Post_tag>;
};
export declare class Tag extends Model {
    static readonly _collection = "tag";
    _meta: "generated-schema";
    [PUBLIC_TYPE_SYMBOL]: TagPublic;
    [RELATIONS_SYMBOL]: __TagRelations;
    id: number;
    name: string;
    _conf_: ModelConfig<this>;
}
export {};
//# sourceMappingURL=Tag.d.ts.map