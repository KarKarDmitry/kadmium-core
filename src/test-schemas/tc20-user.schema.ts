import {
	schema,
	form,
	string,
	sections as s,
	primary,
	ref,
} from "../schema/dsl.js";

export const tc20_userSchema = schema({
	collection: "tc20_user",
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
						name: "name",
						label: "Name",
						required: true,
					}),
					string({
						name: "email",
						label: "Email",
						required: true,
						db: { unique: true, index: true },
					}),
				],
			}),
		],
	}),
});
