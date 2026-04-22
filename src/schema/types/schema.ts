import { Form_OPT } from "./form";
import { NormalizedField_OPT, Primary_OPT } from "./fields";
import { KadmiumFeature } from "../../features/types/base.feature";
import { SchemaCore } from "../../core/schema-core";
import { NormalizedAction_OPT } from "../../schema/types/actions";
import { NormalizedSection_OPT } from "../../schema/types/sections";
import { FeatureModel } from "../../model/types";

export interface Schema_OPT {
  _meta: "schema";
  form: Form_OPT;
  collection: string;
  version: string;
  is_active: boolean;
  primary: Primary_OPT;

  /**
   * Папка для генерации типов.
   * По умолчанию: "schemas" → src/models/schemas/
   * Пример: "features" → src/models/features/
   */
  folder?: string;

  /**
   * Массив классов фич, привязанных к данной схеме.
   * Каждая фича получит SchemaCore в конструктор и сможет
   * добавлять поля, перехватывать операции и регистрировать контроллеры.
   */
  features?: (new (core: SchemaCore) => KadmiumFeature<any>)[];
}


export interface NormalizedSchema {
  primary: Primary_OPT;
  form: {
    sections: NormalizedSection_OPT[];
    fields: NormalizedField_OPT[];
    actions: NormalizedAction_OPT[];
  };
}
