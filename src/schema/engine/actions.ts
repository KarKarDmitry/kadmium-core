import { NormalizedAction_OPT, SectionActions_OPT } from '../types/actions.js';
import { Section_OPT } from '../types/sections.js';
import { walkSections } from './walker.js';

export function getFormActions(form: {
    actions?: SectionActions_OPT[];
}): NormalizedAction_OPT[] {
    if (!form.actions) return [];

    return normalizeActionsChunk(form.actions, []);
}

export function getNormalizedActions(
    sections: Section_OPT[],
): NormalizedAction_OPT[] {
    const actions: NormalizedAction_OPT[] = [];

    walkSections(sections, {
        onSection(section, path) {
            const sectionKey = path.join(':');

            // 🔹 table actions
            if (section.type === 'table' && section.actions) {
                const tableActions = [
                    ...(section.actions.row ?? []),
                    ...(section.actions.bulk ?? []),
                ];

                actions.push(...normalizeActionsChunk(tableActions, path));
            }

            // 🔹 обычные section actions
            if (
                section.type !== 'table' &&
                'actions' in section &&
                Array.isArray(section.actions)
            ) {
                actions.push(...normalizeActionsChunk(section.actions, path));
            }
        },
    });

    return actions;
}

function normalizeActionsChunk(
    actions: SectionActions_OPT[],
    path: string[],
): NormalizedAction_OPT[] {
    const sectionKey = path.join(':');
    const result: NormalizedAction_OPT[] = [];

    for (const action of actions) {
        if (action._meta === 'action-group') {
            result.push(...normalizeActionsChunk(action.actions, path));
            continue;
        }

        result.push({
            ...action,
            section: sectionKey,
            path: Object.freeze([...path]),
        });
    }

    return result;
}
