import {
	schema,
	form,
	string,
	boolean,
	ref,
	sections as s,
	primary,
} from "../schema/init";

export const tc20_postSchema = schema({
	collection: "tc20_post",
	version: "0.1",
	primary: primary({
		name: "id",
		label: "ID",
		db_type: "uuid",
	}),
	form: form({
		sections: [
			s.block({
				key: "main",
				fields: [
					string({
						name: "title",
						label: "Title",
						required: true,
					}),
					ref({
						name: "author_id",
						label: "Author",
						ref: "tc20_user",
						required: true,
					}),
					boolean({
						name: "is_published",
						label: "Published",
						default: false,
					}),
				],
			}),
		],
	}),
});
