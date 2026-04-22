import { Model, ModelConfig } from "../../model/init";
import { PUBLIC_TYPE_SYMBOL, RELATIONS_SYMBOL } from "../../repo/symbols";
import { ToOneRelation } from "../../repo/types/relations";
import { Post } from "./Post";
import { Tag } from "./Tag";
export type Post_tagSensitiveFields = never;
export type Post_tagPublic = Post_tag;
type __Post_tagRelations = {
    post: ToOneRelation<Post>;
    tag: ToOneRelation<Tag>;
};
export declare class Post_tag extends Model {
    static readonly _collection = "post_tag";
    _meta: "generated-schema";
    [PUBLIC_TYPE_SYMBOL]: Post_tagPublic;
    [RELATIONS_SYMBOL]: __Post_tagRelations;
    id: number;
    post_id: number;
    tag_id: number;
    _conf_: ModelConfig<this>;
}
export {};
//# sourceMappingURL=Post_tag.d.ts.map