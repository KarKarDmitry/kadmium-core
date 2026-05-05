import * as fs from 'fs';
import * as path from 'path';
import type { Field_OPT, InputField_OPT } from '../../schema/types/fields.js';
import type { RelationMetadata } from '../../repo/types/relations.js';
import { AppCore } from '../../core/app-core.js';
import { SchemaCore } from '../../core/schema-core.js';
import { Kadmium } from '../../kadmium-app.js';
import type { Schema_OPT } from '../../schema/types/schema.js';
import type { KadmiumFeature } from '../../features/types/base.feature.js';

// ─────────────────────────────────────────────
// Type Guard
// ─────────────────────────────────────────────

function isInputField(field: Field_OPT): field is InputField_OPT {
    return !(field as any).displayOnly;
}

// ─────────────────────────────────────────────
// Argument Parsing
// ─────────────────────────────────────────────

function parseArgs(args: string[]) {
    const options = {
        target: null as string | null,
        config: null as string | null,
    };

    for (const arg of args) {
        if (arg.startsWith('--target=')) {
            options.target = arg.split('=')[1];
        } else if (arg.startsWith('--config=')) {
            options.config = arg.split('=')[1];
        }
    }

    return options;
}

// ─────────────────────────────────────────────
// Type Mapping
// ─────────────────────────────────────────────

function mapSchemaTypeToTsType(fieldType: InputField_OPT['type']): string {
    switch (fieldType) {
        case 'string':
        case 'password':
        case 'email':
        case 'text-area':
            return 'string';
        case 'number':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'date':
        case 'datetime':
        case 'time':
            return 'Date';
        case 'time-range':
        case 'date-range':
            return 'string';
        case 'select':
            return 'string';
        case 'jsonb':
            return 'any';
        default:
            return 'any';
    }
}

function capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Определяет относительный путь от текущей папки до целевой.
 */
function getRelativeImportPath(
    fromFolder: string,
    toFolder: string,
    baseOutputDir: string,
): string {
    if (fromFolder === toFolder) return '.';
    const root = path.resolve(process.cwd(), baseOutputDir);
    const fromAbs = path.resolve(root, fromFolder);
    const toAbs = path.resolve(root, toFolder);
    const rel = path.relative(fromAbs, toAbs) || '.';
    return rel.replace(/\\/g, '/');
}

/**
 * Извлекает содержимое между @Kadmium.gen_skip и @Kadmium.gen_continue
 * Если файл не существует или маркеров нет — возвращает null.
 */
function extractProtectedBlocks(
    filePath: string,
): Record<string, string> | null {
    if (!fs.existsSync(filePath)) return null;

    const content = fs.readFileSync(filePath, 'utf-8');
    const blocks: Record<string, string> = {};

    // Ищем блоки вида:
    // // @Kadmium.gen_skip:<name>
    // ... code ...
    // // @Kadmium.gen_continue:<name>
    const regex =
        /\/\/\s*@Kadmium\.gen_skip:(\w+)([\s\S]*?)\/\/\s*@Kadmium\.gen_continue:\1/g;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
        // Save the ENTIRE block including markers, so they survive regeneration
        blocks[match[1]] = match[0];
    }

    return Object.keys(blocks).length > 0 ? blocks : null;
}

/**
 * Генерирует код relations и импорты.
 */
function generateSchemaRelationsAndImports(
    appCore: AppCore,
    collectionName: string,
    interfaceName: string,
    currentFolder: string,
    baseOutputDir: string,
): { relationsTypeString: string; relationImports: Map<string, string> } {
    const schemaRelations: RelationMetadata[] = [];
    const relationImports = new Map<string, string>();

    appCore.relationMap.forEach((meta) => {
        if (meta.fromSchema === collectionName) {
            schemaRelations.push(meta);
            const targetClassName = capitalizeFirstLetter(meta.toSchema);
            const targetSchema = appCore.schemas.find(
                (s) => s.collection === meta.toSchema,
            );
            const targetFolder = targetSchema?.folder ?? 'models';
            const relPath = getRelativeImportPath(
                currentFolder,
                targetFolder,
                baseOutputDir,
            );
            relationImports.set(targetClassName, relPath);
        }
    });

    let relationsTypeString = '';
    if (schemaRelations.length > 0) {
        relationsTypeString += `type __${interfaceName}Relations = {\n`;
        schemaRelations
            .sort((a, b) => {
                const nameA =
                    a.type === 'many-to-one' ? a.inverseName : a.fromField;
                const nameB =
                    b.type === 'many-to-one' ? b.inverseName : b.fromField;
                return nameA.localeCompare(nameB);
            })
            .forEach((rel) => {
                const targetModelName = capitalizeFirstLetter(rel.toSchema);
                const propertyName =
                    rel.type === 'many-to-one'
                        ? rel.inverseName
                        : rel.fromField;

                if (rel.type === 'one-to-many') {
                    relationsTypeString += `\t${propertyName}: ToManyRelation<${targetModelName}>;\n`;
                } else if (rel.type === 'one-to-one') {
                    relationsTypeString += `\t${propertyName}: ToOneRelation<${targetModelName}>;\n`;
                } else {
                    relationsTypeString += `\t${propertyName}: ToOneRelation<${targetModelName}>;\n`;
                }
            });
        relationsTypeString += `};\n\n`;
    } else {
        relationsTypeString += `type __${interfaceName}Relations = never;\n\n`;
    }

    return { relationsTypeString, relationImports };
}

/**
 * Генерирует _conf_ блок с хуками, validation и features.
 */
function generateConf(
    schemaCore: (typeof Kadmium.appCore.schemas)[number],
    _interfaceName: string,
    protectedBlocks: Record<string, string> | null,
): string {
    const hookNames = [
        'beforeCreate',
        'afterCreate',
        'beforeUpdate',
        'afterUpdate',
        'beforeDelete',
        'afterDelete',
        'beforeRead',
        'afterRead',
    ];

    // Если есть защищённый блок — отдаём его целиком
    if (protectedBlocks && protectedBlocks['conf']) {
        return protectedBlocks['conf'];
    }

    const featureClasses = schemaCore.features;
    const featureNames = featureClasses
        .map((f: any) => f.constructor.name)
        .filter((name: any) => name && name !== 'KadmiumFeature');

    let result = `\n\t// @Kadmium.gen_skip:conf\n`;
    result += `\t_conf_: ModelConfig<this> = {\n`;
    result += `\t\thooks: {\n`;

    result += `\t\t\t${hookNames[0]}: [\n`;
    result += `\t\t\t\t(ctx) => {\n`;
    result += `\t\t\t\t\t// TODO: implement ${hookNames[0]}\n`;
    result += `\t\t\t\t},\n`;
    result += `\t\t\t],\n`;

    hookNames.slice(1).forEach((hook) => {
        result += `\t\t\t${hook}: [],\n`;
    });

    result += `\t\t},\n`;

    // Validation rules — placeholder
    result += `\t\tvalidation: {\n\t\t\trules: [\n`;
    result += `\t\t\t\t{ name: "example", refine: (data: this, ctx) => {\n`;
    result += `\t\t\t\t\t// TODO: implement refine function\n`;
    result += `\t\t\t\t}},\n`;
    result += `\t\t\t],\n\t\t},\n`;

    // Features — from schema
    if (featureNames.length > 0) {
        result += `\t\tfeatures: [${featureNames.join(', ')}],\n`;
    } else {
        result += `\t\tfeatures: [],\n`;
    }

    result += `\t};\n`;
    result += `\t// @Kadmium.gen_continue:conf\n`;
    return result;
}

// ─────────────────────────────────────────────
// Main Generation
// ─────────────────────────────────────────────

export async function run(args: string[] = []) {
    const options = parseArgs(args);
    console.log('Starting model generation with options:', options);

    // Use the Kadmium manager
    await Kadmium.setConfig(options.config ?? undefined);
    await Kadmium.preheat();

    const appCore = Kadmium.appCore;

    if (appCore.schemas.length === 0) {
        console.error('No schemas found. Nothing to generate.');
        return;
    }

    let schemasToProcess = appCore.schemas;

    if (options.target) {
        schemasToProcess = appCore.schemas.filter(
            (s) => s.collection === options.target,
        );
        if (schemasToProcess.length === 0) {
            console.error(
                `Error: Schema with collection name "${options.target}" not found.`,
            );
            return;
        }
    }

    console.log(`Found ${schemasToProcess.length} schemas to process.`);

    const sensitiveTypes = appCore.securedTypes;

    const genConfig = appCore.gen ?? {};

    const baseOutputDir = genConfig.models_output ?? './src/models';
    const importBase = genConfig.importBase ?? '@karkardmitry/kadmium-core';

    for (const schemaCore of schemasToProcess) {
        const collectionName = schemaCore.collection;
        const interfaceName = capitalizeFirstLetter(collectionName);
        const publicTypeName = `${interfaceName}Public`;
        const sensitiveFieldsTypeName = `${interfaceName}SensitiveFields`;
        const folder = schemaCore.folder ?? 'models';

        // Determine output path: baseOutputDir/folder/InterfaceName.ts
        const outputDir = path.join(process.cwd(), baseOutputDir, folder);
        const outputPath = path.join(outputDir, `${interfaceName}.ts`);

        // Extract protected blocks from existing file
        const protectedBlocks = extractProtectedBlocks(outputPath);

        const allFields = [
            schemaCore.normalized.primary as Field_OPT,
            ...schemaCore.normalized.form.fields,
        ];
        const inputFields = allFields.filter(isInputField);

        // ── Helper types (SensitiveFields and Public) ──
        const sensitiveFieldNames = inputFields
            .filter((field) => sensitiveTypes.has(field.type))
            .map((field) => `'${field.name}'`);

        let helperTypesString = '';
        if (sensitiveFieldNames.length > 0) {
            helperTypesString += `export type ${sensitiveFieldsTypeName} = ${sensitiveFieldNames.join(
                ' | ',
            )};\n\n`;
            helperTypesString += `export type ${publicTypeName} = Omit<${interfaceName}, ${sensitiveFieldsTypeName}>;\n\n`;
        } else {
            helperTypesString += `export type ${sensitiveFieldsTypeName} = never;\n\n`;
            helperTypesString += `export type ${publicTypeName} = ${interfaceName};\n\n`;
        }

        // ── Relations ──
        const { relationsTypeString, relationImports } =
            generateSchemaRelationsAndImports(
                appCore,
                collectionName,
                interfaceName,
                folder,
                baseOutputDir,
            );

        // ── Build class string ──
        let classString = `// Auto-generated by Kadmium. Do not edit manually.\n`;
        classString += `// Use @Kadmium.gen_skip:<name> and @Kadmium.gen_continue:<name> to protect blocks.\n\n`;

        // Imports
        classString += `import { Model, ModelHookContext, ModelConfig } from "${importBase}/model";\n`;
        classString += `import { PUBLIC_TYPE_SYMBOL, RELATIONS_SYMBOL } from "${importBase}/repo";\n`;
        classString += `import { ToOneRelation, ToManyRelation } from "${importBase}/repo";\n`;
        classString += `import { KadmiumRefinementCtx } from "${importBase}/validation";\n`;

        const featureClasses = schemaCore.features;
        const featureImports = featureClasses
            .map((f: KadmiumFeature) => f.constructor.name)
            .filter((name: any) => name && name !== 'KadmiumFeature')
            .join(', ');

        if (featureImports) {
            classString += `import { ${featureImports} } from "${importBase}/features";\n`;
        }

        if (relationImports.size > 0) {
            classString += Array.from(relationImports.entries())
                .map(
                    ([name, relPath]) =>
                        `import { ${name} } from "${relPath}/${name}";`,
                )
                .join('\n');
            classString += '\n';
        }

        classString += `\n`;
        classString += helperTypesString;
        classString += relationsTypeString;

        classString += `export class ${interfaceName} extends Model {\n`;
        classString += `\tstatic readonly _collection = "${collectionName}";\n`;
        classString += `\t_meta: "generated-schema" = "generated-schema";\n`;
        classString += `\t[PUBLIC_TYPE_SYMBOL]!: ${publicTypeName};\n`;

        if (
            relationsTypeString !==
            `type __${interfaceName}Relations = never;\n\n`
        ) {
            classString += `\t[RELATIONS_SYMBOL]!: __${interfaceName}Relations;\n`;
        }

        classString += `\n`;

        // ── Fields ──
        for (const field of inputFields) {
            let tsType: string;

            if (field.type === 'primary') {
                switch (field.db_type) {
                    case 'uuid':
                    case 'string':
                        tsType = 'string';
                        break;
                    case 'number':
                        tsType = 'number';
                        break;
                    default:
                        tsType = 'string | number';
                        break;
                }
            } else if (field.type === 'ref') {
                const refCollectionName = (field as any).ref;
                const refSchema = appCore.schemas.find(
                    (s) => s.collection === refCollectionName,
                );
                if (refSchema) {
                    const refPkType = refSchema.normalized.primary.db_type;
                    tsType = refPkType === 'number' ? 'number' : 'string';
                } else {
                    tsType = 'string | number';
                    console.warn(
                        `[Generator] Could not find schema for ref "${refCollectionName}". Defaulting type to "string | number".`,
                    );
                }
            } else {
                tsType = mapSchemaTypeToTsType(field.type);
            }

            const isOptional = field.required === false;
            const isExplicitlyNullable = field.db?.nullable === true;

            if (isOptional || isExplicitlyNullable) {
                if (!tsType.includes(' | null')) {
                    tsType += ' | null';
                }
            }

            classString += `\t${field.name}!: ${tsType};\n`;
        }

        // ── Hooks + Validation + Features (в _conf_) ──
        classString += generateConf(schemaCore, interfaceName, protectedBlocks);

        classString += `\n}\n`;

        // ── Ensure output directory exists ──
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, classString);
        console.log(`Successfully generated ${outputPath}`);
    }

    console.log('Model generation finished successfully.');
}
