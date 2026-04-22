import {
	schema,
	form,
	primary,
	ref,
	string,
	sections as s,
} from "../schema/init";
import { SoftDeleteFeature } from "../features/soft-delete.feature";

export const commentSchema = schema({
	collection: "comment",
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
				title: "Comment",
				fields: [
					string({
						name: "body",
						label: "Comment Body",
						required: true,
					}),
					ref({
						name: "post_id",
						label: "Post",
						ref: "post",
						required: true,
					}),
					ref({
						name: "user_id",
						label: "Author",
						ref: "user",
						required: true,
					}),
				],
			}),
		],
	}),
	features: [SoftDeleteFeature],
});
	