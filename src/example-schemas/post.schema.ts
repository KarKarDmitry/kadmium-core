import {
  schema,
  form,
  string,
  boolean,
  ref,
  primary,
  datetime,
  sections as s,
  action,
} from "../schema/init";
import { AuditFeature } from "../features/audit.feature";
import { RevisionsFeature } from "../features/revisions.feature";

// 1. Define the schema object for a blog post.
export const postSchema = schema({
  collection: "post",
  version: "0.1",
  primary: primary({
    name: "id",
    label: "ID",
    db_type: "number",
    auto_increment: true,
  }),
  form: form({
    sections: [
      s.block({
        key: "main",
        title: "Содержимое поста",
        fields: [
          string({
            name: "title",
            label: "Заголовок поста",
            required: true,
          }),
          string({
            name: "content",
            label: "Содержимое",
            required: false,
          }),
          boolean({
            name: "is_published",
            label: "Опубликовано",
            default: false,
            variant: "switch",
          }),
          // This is the foreign key relationship to the 'user' collection.
          ref({
            name: "author_id",
            label: "Автор",
            ref: "user", // This must match the 'collection' name in user.schema.ts
            required: true,
          }),
          datetime({
            // Using the refactored datetime builder
            name: "published_at",
            label: "Дата публикации",
            required: false,
            db: { nullable: true },
          }),
        ],
        actions: [
          action({
            name: "save",
            label: "Сохранить",
            source: ":id/save",
          }),
        ],
      }),
    ],
  }),
  features: [AuditFeature, RevisionsFeature],
});

// Schema is now discovered and initialized by KadmiumApp.
