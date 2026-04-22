import { KadmiumSqb, WhereCondition, WhereGroup } from "../../sqb/kadmium-sqb";

export abstract class BaseWhereBuilder<
  TProxy,
  TThis extends BaseWhereBuilder<TProxy, TThis>,
> {
  // Each builder instance operates on a specific group within the tree
  constructor(
    protected _sqb: KadmiumSqb<any>,
    protected _proxy: TProxy,
    protected _group: WhereGroup,
  ) { }

  private _add(
    clause: ((fields: TProxy) => WhereCondition) | [(group: TThis) => void],
    op: "AND" | "OR",
  ): TThis {
    // Set operator for the current group if it's the first condition
    if (this._group.conditions.length === 0) {
      this._group.op = op;
    }
    // If operators differ at the same level, we must restructure the tree.
    // This ensures that `where(A).or(B).and(C)` becomes `(A OR B) AND C`.
    else if (this._group.op !== op) {
      const existingGroup: WhereGroup = {
        op: this._group.op,
        conditions: this._group.conditions,
      };
      this._group.op = op;
      this._group.conditions = [existingGroup];
    }

    // Handle Grouping: clause is passed as [(group) => void]
    if (Array.isArray(clause)) {
      const newGroup: WhereGroup = { op: "AND", conditions: [] };

      // Temporarily swap the group context on the current builder instance
      const originalGroup = this._group;
      this._group = newGroup;

      try {
        clause[0](this as any);
      } finally {
        this._group = originalGroup;
      }

      if (newGroup.conditions.length > 0) {
        this._group.conditions.push(newGroup);
      }
    }
    // Handle Simple Condition: clause is (fields) => WhereCondition
    else {
      const condition = clause(this._proxy);
      this._group.conditions.push(condition);
    }

    return this as any;
  }

  /**
   * Adds a nested where group (parenthesized conditions).
   * @example repo.where(e => e.active.eq(true)).group(q => q.where(e => e.name.eq("A")).or(e => e.name.eq("B")))
   */
  public group(callback: (group: TThis) => void): TThis {
    const newGroup: WhereGroup = { op: "AND", conditions: [] };

    // Temporarily swap the group context on the current builder instance
    const originalGroup = this._group;
    this._group = newGroup;

    try {
      callback(this as any);
    } finally {
      this._group = originalGroup;
    }

    if (newGroup.conditions.length > 0) {
      this._group.conditions.push(newGroup);
    }

    return this as any;
  }

  public where(clause: (fields: TProxy) => WhereCondition): TThis;
  /**
   * @deprecated Use .group() instead: repo.group(q => q.where(...).or(...))
   */
  public where(clause: [(group: TThis) => void]): TThis;
  public where(
    clause: ((fields: TProxy) => WhereCondition) | [(group: TThis) => void],
  ): TThis {
    if (Array.isArray(clause)) {
      return this.group(clause[0]);
    }
    return this._add(clause, "AND");
  }

  public and(clause: (fields: TProxy) => WhereCondition): TThis;
  public and(clause: [(group: TThis) => void]): TThis;
  public and(
    clause: ((fields: TProxy) => WhereCondition) | [(group: TThis) => void],
  ): TThis {
    return this._add(clause, "AND");
  }

  public or(clause: (fields: TProxy) => WhereCondition): TThis;
  public or(clause: [(group: TThis) => void]): TThis;
  public or(
    clause: ((fields: TProxy) => WhereCondition) | [(group: TThis) => void],
  ): TThis {
    return this._add(clause, "OR");
  }
}
