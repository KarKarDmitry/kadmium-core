import { Model, ModelConfig } from "../../model/init";
import { PUBLIC_TYPE_SYMBOL, RELATIONS_SYMBOL } from "../../repo/symbols";
import { ToOneRelation, ToManyRelation } from "../../repo/types/relations";
import { User } from "./User";
import { Post_tag } from "./Post_tag";
import { Comment } from "./Comment";
export type PostSensitiveFields = never;
export type PostPublic = Post;
type __PostRelations = {
    author: ToOneRelation<User>;
    comments: ToManyRelation<Comment>;
    post_tags: ToManyRelation<Post_tag>;
};
export declare class Post extends Model {
    static readonly _collection = "post";
    _meta: "generated-schema";
    [PUBLIC_TYPE_SYMBOL]: PostPublic;
    [RELATIONS_SYMBOL]: __PostRelations;
    id: number;
    title: string;
    content: string | null;
    is_published: boolean | null;
    author_id: string;
    published_at: Date | null;
    created_at: Date | null;
    updated_at: Date | null;
    _conf_: ModelConfig<this>;
}
export {};
//# sourceMappingURL=Post.d.ts.map