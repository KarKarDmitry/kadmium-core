import { schema, form, primary, ref, sections as s } from "../schema/init";

export const postTagSchema = schema({
	collection: "post_tag",
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
				title: "Post-Tag Link",
				fields: [
					ref({
						name: "post_id",
						label: "Post",
						ref: "post",
						required: true,
					}),
					ref({
						name: "tag_id",
						label: "Tag",
						ref: "tag",
						required: true,
					}),
				],
			}),
		],
	}),
});
