import { Model, ModelConfig } from "../../model/init";
import { PUBLIC_TYPE_SYMBOL, RELATIONS_SYMBOL } from "../../repo/symbols";
import { ToOneRelation, ToManyRelation } from "../../repo/types/relations";
import { Department } from "./Department";
import { Revision } from "../features/Revision";
import { Post } from "./Post";
import { Comment } from "./Comment";
export type UserSensitiveFields = 'password' | 'confirm_password';
export type UserPublic = Omit<User, UserSensitiveFields>;
type __UserRelations = {
    comments: ToManyRelation<Comment>;
    department: ToOneRelation<Department>;
    posts: ToManyRelation<Post>;
    revisions: ToManyRelation<Revision>;
};
export declare class User extends Model {
    static readonly _collection = "user";
    _meta: "generated-schema";
    [PUBLIC_TYPE_SYMBOL]: UserPublic;
    [RELATIONS_SYMBOL]: __UserRelations;
    id: string;
    first_name: string;
    last_name: string;
    middle_name: string | null;
    department_id: number | null;
    email: string;
    username: string;
    password: string;
    confirm_password: string;
    _conf_: ModelConfig<this>;
}
export {};
//# sourceMappingURL=User.d.ts.map