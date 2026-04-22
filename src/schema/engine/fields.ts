import { NormalizedField_OPT } from "../types/fields";
import { Section_OPT } from "../types/sections";
import { walkSections } from "./walker";

export function getNormalizedFields(
	sections: Section_OPT[],
): NormalizedField_OPT[] {
	const fields: NormalizedField_OPT[] = [];

	walkSections(sections, {
		onSection(section, path) {
			if (!("fields" in section) || !section.fields) return;

			const sectionKey = path.join(":");

			for (const field of section.fields) {
				fields.push({
					...field,
					section: sectionKey,
					path: Object.freeze([...path]),
				});
			}
		},
	});

	return fields;
}
