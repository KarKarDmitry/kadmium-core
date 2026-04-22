// src/schema/engine/schema.ts

import { SchemaCore } from "../../core/schema-core";
import { Form_OPT } from "../types/form";
import { Primary_OPT } from "../types/fields";
import { Schema_OPT } from "../types/schema";
import { KadmiumFeature } from "../../features/types/base.feature";
import { FeatureModel } from "../../model/types";
import { Errors } from "../../core/errors";

export class Schema implements Schema_OPT {
  public readonly _meta: "schema" = "schema";
  public primary: Primary_OPT;
  public features?: (new (core: SchemaCore) => KadmiumFeature<any>)[];
  public folder?: string;

  constructor(
    public form: Form_OPT,
    public collection: string,
    public version: string,
    public is_active: boolean,
    primary: Primary_OPT,
    features?: (new (core: SchemaCore) => KadmiumFeature<any>)[],
    folder?: string,
  ) {
    this.primary = primary;
    this.features = features;
    this.folder = folder;
    this.core = new SchemaCore(this);
  }

  initialized: boolean = false;
  public core: SchemaCore;

  static from(opt: Omit<Schema_OPT, "_meta">, init?: boolean): Schema {
    // Validate required fields early — fail fast
    if (!opt.collection) {
      throw Errors.schema.missingCollection();
    }
    if (!opt.primary) {
      throw Errors.schema.missingPrimary(opt.collection);
    }
    if (!opt.primary.name) {
      throw Errors.schema.missingPrimaryName(opt.collection);
    }
    if (!opt.primary.db_type) {
      throw Errors.schema.missingPrimaryDbType(opt.collection);
    }
    if (!opt.form) {
      throw Errors.schema.missingForm(opt.collection);
    }

    const schema = new Schema(
      opt.form,
      opt.collection,
      opt.version,
      opt.is_active,
      opt.primary,
      opt.features,
      opt.folder,
    );
    schema.initialized = init ?? false;
    return schema;
  }
}
