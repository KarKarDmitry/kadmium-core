"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const kadmium_app_1 = require("../kadmium-app");
// ─────────────────────────────────────────────
// Type Guard
// ─────────────────────────────────────────────
function isInputField(field) {
    return !field.displayOnly;
}
// ─────────────────────────────────────────────
// Argument Parsing
// ─────────────────────────────────────────────
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        target: null,
    };
    for (const arg of args) {
        if (arg.startsWith("--target=")) {
            options.target = arg.split("=")[1];
        }
    }
    return options;
}
// ─────────────────────────────────────────────
// Type Mapping
// ─────────────────────────────────────────────
function mapSchemaTypeToTsType(fieldType) {
    switch (fieldType) {
        case "string":
        case "password":
        case "email":
        case "text-area":
            return "string";
        case "number":
            return "number";
        case "boolean":
            return "boolean";
        case "date":
        case "datetime":
        case "time":
            return "Date";
        case "time-range":
        case "date-range":
            return "string";
        case "select":
            return "string";
        case "jsonb":
            return "any";
        default:
            return "any";
    }
}
function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
/**
 * Определяет относительный путь от текущей папки до целевой.
 */
function getRelativeImportPath(fromFolder, toFolder) {
    if (fromFolder === toFolder)
        return ".";
    const rel = path.relative(path.resolve(process.cwd(), "src", fromFolder), path.resolve(process.cwd(), "src", toFolder));
    // Normalize Windows backslashes to forward slashes for imports
    return rel.replace(/\\/g, "/");
}
/**
 * Извлекает содержимое между @Kadmium.gen_skip и @Kadmium.gen_continue
 * Если файл не существует или маркеров нет — возвращает null.
 */
function extractProtectedBlocks(filePath) {
    if (!fs.existsSync(filePath))
        return null;
    const content = fs.readFileSync(filePath, "utf-8");
    const blocks = {};
    // Ищем блоки вида:
    // // @Kadmium.gen_skip:<name>
    // ... code ...
    // // @Kadmium.gen_continue:<name>
    const regex = /\/\/\s*@Kadmium\.gen_skip:(\w+)([\s\S]*?)\/\/\s*@Kadmium\.gen_continue:\1/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        // Save the ENTIRE block including markers, so they survive regeneration
        blocks[match[1]] = match[0];
    }
    return Object.keys(blocks).length > 0 ? blocks : null;
}
/**
 * Генерирует код relations и импорты.
 */
function generateSchemaRelationsAndImports(appCore, collectionName, interfaceName, currentFolder) {
    const schemaRelations = [];
    const relationImports = new Map();
    appCore.relationMap.forEach((meta) => {
        if (meta.fromSchema === collectionName) {
            schemaRelations.push(meta);
            const targetClassName = capitalizeFirstLetter(meta.toSchema);
            const targetSchema = appCore.schemas.find((s) => s.collection === meta.toSchema);
            const targetFolder = targetSchema?.folder ?? "models";
            const relPath = getRelativeImportPath(currentFolder, targetFolder);
            relationImports.set(targetClassName, relPath);
        }
    });
    let relationsTypeString = "";
    if (schemaRelations.length > 0) {
        relationsTypeString += `type __${interfaceName}Relations = {\n`;
        schemaRelations
            .sort((a, b) => {
            const nameA = a.type === "many-to-one" ? a.inverseName : a.fromField;
            const nameB = b.type === "many-to-one" ? b.inverseName : b.fromField;
            return nameA.localeCompare(nameB);
        })
            .forEach((rel) => {
            const targetModelName = capitalizeFirstLetter(rel.toSchema);
            const propertyName = rel.type === "many-to-one" ? rel.inverseName : rel.fromField;
            if (rel.type === "one-to-many") {
                relationsTypeString += `\t${propertyName}: ToManyRelation<${targetModelName}>;\n`;
            }
            else if (rel.type === "one-to-one") {
                relationsTypeString += `\t${propertyName}: ToOneRelation<${targetModelName}>;\n`;
            }
            else {
                relationsTypeString += `\t${propertyName}: ToOneRelation<${targetModelName}>;\n`;
            }
        });
        relationsTypeString += `};\n\n`;
    }
    else {
        relationsTypeString += `type __${interfaceName}Relations = never;\n\n`;
    }
    return { relationsTypeString, relationImports };
}
/**
 * Генерирует _conf_ блок с хуками, validation и features.
 */
function generateConf(schemaCore, _interfaceName, protectedBlocks) {
    const hookNames = [
        "beforeCreate",
        "afterCreate",
        "beforeUpdate",
        "afterUpdate",
        "beforeDelete",
        "afterDelete",
        "beforeRead",
        "afterRead",
    ];
    // Если есть защищённый блок — отдаём его целиком
    if (protectedBlocks && protectedBlocks["conf"]) {
        return protectedBlocks["conf"];
    }
    const featureClasses = schemaCore.features;
    const featureNames = featureClasses
        .map((f) => f.constructor.name)
        .filter((name) => name && name !== "KadmiumFeature");
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
        result += `\t\tfeatures: [${featureNames.join(", ")}],\n`;
    }
    else {
        result += `\t\tfeatures: [],\n`;
    }
    result += `\t};\n`;
    result += `\t// @Kadmium.gen_continue:conf\n`;
    return result;
}
// ─────────────────────────────────────────────
// Main Generation
// ─────────────────────────────────────────────
async function generate() {
    const options = parseArgs();
    console.log("Starting model generation with options:", options);
    // Use the Kadmium manager
    kadmium_app_1.Kadmium.configure({
        schemaSources: ["./src/example-schemas/**/*.schema.ts"],
    });
    await kadmium_app_1.Kadmium.preheat();
    const appCore = kadmium_app_1.Kadmium.appCore;
    if (appCore.schemas.length === 0) {
        console.error("No schemas found. Nothing to generate.");
        return;
    }
    let schemasToProcess = appCore.schemas;
    if (options.target) {
        schemasToProcess = appCore.schemas.filter((s) => s.collection === options.target);
        if (schemasToProcess.length === 0) {
            console.error(`Error: Schema with collection name "${options.target}" not found.`);
            return;
        }
    }
    console.log(`Found ${schemasToProcess.length} schemas to process.`);
    const sensitiveTypes = appCore.securedTypes;
    const baseOutputDir = appCore.gen.models_output ?? "models";
    for (const schemaCore of schemasToProcess) {
        const collectionName = schemaCore.collection;
        const interfaceName = capitalizeFirstLetter(collectionName);
        const publicTypeName = `${interfaceName}Public`;
        const sensitiveFieldsTypeName = `${interfaceName}SensitiveFields`;
        const folder = schemaCore.folder ?? "models";
        // Determine output path: baseOutputDir/folder/InterfaceName.ts
        const outputDir = path.join(process.cwd(), "src", baseOutputDir, folder);
        const outputPath = path.join(outputDir, `${interfaceName}.ts`);
        // Extract protected blocks from existing file
        const protectedBlocks = extractProtectedBlocks(outputPath);
        const allFields = [
            schemaCore.normalized.primary,
            ...schemaCore.normalized.form.fields,
        ];
        const inputFields = allFields.filter(isInputField);
        // ── Helper types (SensitiveFields and Public) ──
        const sensitiveFieldNames = inputFields
            .filter((field) => sensitiveTypes.has(field.type))
            .map((field) => `'${field.name}'`);
        let helperTypesString = "";
        if (sensitiveFieldNames.length > 0) {
            helperTypesString += `export type ${sensitiveFieldsTypeName} = ${sensitiveFieldNames.join(" | ")};\n\n`;
            helperTypesString += `export type ${publicTypeName} = Omit<${interfaceName}, ${sensitiveFieldsTypeName}>;\n\n`;
        }
        else {
            helperTypesString += `export type ${sensitiveFieldsTypeName} = never;\n\n`;
            helperTypesString += `export type ${publicTypeName} = ${interfaceName};\n\n`;
        }
        // ── Relations ──
        const { relationsTypeString, relationImports } = generateSchemaRelationsAndImports(appCore, collectionName, interfaceName, folder);
        // ── Build class string ──
        let classString = `// Auto-generated by Kadmium. Do not edit manually.\n`;
        classString += `// Use @Kadmium.gen_skip:<name> and @Kadmium.gen_continue:<name> to protect blocks.\n\n`;
        // Imports
        classString += `import { Model, ModelHookContext, ModelConfig } from "../../model/init";\n`;
        classString += `import { PUBLIC_TYPE_SYMBOL, RELATIONS_SYMBOL } from "../../repo/symbols";\n`;
        classString += `import { ToOneRelation, ToManyRelation } from "../../repo/types/relations";\n`;
        classString += `import { KadmiumRefinementCtx } from "../../validation/types/refinement";\n`;
        const featureClasses = schemaCore.features;
        const featureImports = featureClasses
            .map((f) => f.constructor.name)
            .filter((name) => name && name !== "KadmiumFeature")
            .join(", ");
        if (featureImports) {
            classString += `import { ${featureImports} } from "../../features/init";\n`;
        }
        if (relationImports.size > 0) {
            classString += Array.from(relationImports.entries())
                .map(([name, relPath]) => `import { ${name} } from "${relPath}/${name}";`)
                .join("\n");
            classString += "\n";
        }
        classString += `\n`;
        classString += helperTypesString;
        classString += relationsTypeString;
        classString += `export class ${interfaceName} extends Model {\n`;
        classString += `\tstatic readonly _collection = "${collectionName}";\n`;
        classString += `\t_meta: "generated-schema" = "generated-schema";\n`;
        classString += `\t[PUBLIC_TYPE_SYMBOL]!: ${publicTypeName};\n`;
        if (relationsTypeString !== `type __${interfaceName}Relations = never;\n\n`) {
            classString += `\t[RELATIONS_SYMBOL]!: __${interfaceName}Relations;\n`;
        }
        classString += `\n`;
        // ── Fields ──
        for (const field of inputFields) {
            let tsType;
            if (field.type === "primary") {
                switch (field.db_type) {
                    case "uuid":
                    case "string":
                        tsType = "string";
                        break;
                    case "number":
                        tsType = "number";
                        break;
                    default:
                        tsType = "string | number";
                        break;
                }
            }
            else if (field.type === "ref") {
                const refCollectionName = field.ref;
                const refSchema = appCore.schemas.find((s) => s.collection === refCollectionName);
                if (refSchema) {
                    const refPkType = refSchema.normalized.primary.db_type;
                    tsType = refPkType === "number" ? "number" : "string";
                }
                else {
                    tsType = "string | number";
                    console.warn(`[Generator] Could not find schema for ref "${refCollectionName}". Defaulting type to "string | number".`);
                }
            }
            else {
                tsType = mapSchemaTypeToTsType(field.type);
            }
            const isOptional = field.required === false;
            const isExplicitlyNullable = field.db?.nullable === true;
            if (isOptional || isExplicitlyNullable) {
                if (!tsType.includes(" | null")) {
                    tsType += " | null";
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
    console.log("Model generation finished successfully.");
}
generate().catch((error) => {
    console.error("An error occurred during model generation:", error);
    process.exit(1);
});
//# sourceMappingURL=generate-types.js.map