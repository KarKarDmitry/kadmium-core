"use strict";
// src/schema/engine/schema.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schema = void 0;
const schema_core_1 = require("../../core/schema-core");
const errors_1 = require("../../core/errors");
class Schema {
    constructor(form, collection, version, is_active, primary, features, folder) {
        this.form = form;
        this.collection = collection;
        this.version = version;
        this.is_active = is_active;
        this._meta = "schema";
        this.initialized = false;
        this.primary = primary;
        this.features = features;
        this.folder = folder;
        this.core = new schema_core_1.SchemaCore(this);
    }
    static from(opt, init) {
        // Validate required fields early — fail fast
        if (!opt.collection) {
            throw errors_1.Errors.schema.missingCollection();
        }
        if (!opt.primary) {
            throw errors_1.Errors.schema.missingPrimary(opt.collection);
        }
        if (!opt.primary.name) {
            throw errors_1.Errors.schema.missingPrimaryName(opt.collection);
        }
        if (!opt.primary.db_type) {
            throw errors_1.Errors.schema.missingPrimaryDbType(opt.collection);
        }
        if (!opt.form) {
            throw errors_1.Errors.schema.missingForm(opt.collection);
        }
        const schema = new Schema(opt.form, opt.collection, opt.version, opt.is_active, opt.primary, opt.features, opt.folder);
        schema.initialized = init ?? false;
        return schema;
    }
}
exports.Schema = Schema;
//# sourceMappingURL=schema.js.map