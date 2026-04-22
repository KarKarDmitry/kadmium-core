import { Model, ModelConfig } from "../../model/init";
import { PUBLIC_TYPE_SYMBOL, RELATIONS_SYMBOL } from "../../repo/symbols";
import { ToOneRelation } from "../../repo/types/relations";
import { Post } from "./Post";
import { User } from "./User";
export type CommentSensitiveFields = never;
export type CommentPublic = Comment;
type __CommentRelations = {
    post: ToOneRelation<Post>;
    user: ToOneRelation<User>;
};
export declare class Comment extends Model {
    static readonly _collection = "comment";
    _meta: "generated-schema";
    [PUBLIC_TYPE_SYMBOL]: CommentPublic;
    [RELATIONS_SYMBOL]: __CommentRelations;
    id: number;
    body: string;
    post_id: number;
    user_id: string;
    deleted_at: Date | null;
    _conf_: ModelConfig<this>;
}
export {};
//# sourceMappingURL=Comment.d.ts.map