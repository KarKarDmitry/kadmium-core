import { AnyModel } from "../../model/model";
import { RELATIONS_SYMBOL } from "../symbols";

// --- METADATA TYPES ---
export interface RelationMetadata {
  type: "one-to-one" | "many-to-one" | "one-to-many";
  fromSchema: string; // collection name
  fromField: string; // field with 'ref'
  toSchema: string; // collection name
  inverseName: string; // calculated name on the other side
}

// --- RELATION TYPES ---

// Base types for describing relations
export type ToOneRelation<T> = T;
export type ToManyRelation<T> = T[];

// Helper to extract the relations object from the phantom symbol property
export type RelationsOf<T> = T extends { [RELATIONS_SYMBOL]: infer R }
  ? R
  : never;

// --- RELATION CLASSES (Future Refactoring) ---

export class RelationBase { }

export class ToOneRelationHandle<
  T extends AnyModel,
> extends RelationBase {
  constructor(private metadata: RelationMetadata) {
    super();
  }
}

export class ToManyRelationHandle<
  T extends AnyModel,
> extends RelationBase {
  constructor(private metadata: RelationMetadata) {
    super();
  }
}
