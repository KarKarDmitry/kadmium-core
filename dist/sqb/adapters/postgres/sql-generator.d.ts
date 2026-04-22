/**
 * SqlGenerator — строит SQL для SELECT/UPDATE/DELETE.
 * Включает: SELECT с INCLUDE, JOIN-логика, WHERE, GROUP BY, ORDER BY, LIMIT/OFFSET.
 */
import { AnyModel } from "../../../model/model";
import { KadmiumSqb, WhereCondition, IncludedRelation } from "../../kadmium-sqb";
import { SchemaCore } from "../../../core/schema-core";
export declare abstract class SqlGenerator {
    protected securedTypes: Set<string>;
    private _buildJoinGraph;
    private _findJoinIslands;
    protected _buildSubquerySelectClause<T extends AnyModel>(alias: string, relatedSqb: KadmiumSqb<T>, relatedSchemaCore: SchemaCore, values: any[], paramIndex: {
        p: number;
    }): string;
    protected _buildSubqueryNestedIncludes<T extends AnyModel>(relatedSqb: KadmiumSqb<T>, alias: string, values: any[], paramIndex: {
        p: number;
    }): string;
    protected _buildSubqueryModifiers<T extends AnyModel>(alias: string, relatedSqb: KadmiumSqb<T>, values: any[], paramIndex: {
        p: number;
    }): {
        groupBy: string;
        orderBy: string;
        limit: string;
        offset: string;
    };
    protected _buildIncludeSubquery<T extends AnyModel>(includedRelation: IncludedRelation, correlationCondition: WhereCondition, values: any[], paramIndex: {
        p: number;
    }): string;
    toSql<T extends AnyModel>(sqb: KadmiumSqb<T>): {
        text: string;
        values: any[];
    };
    private _buildQuery;
    private _buildSelectQuery;
    private _buildSelectQueryText;
    private _buildUpdateQuery;
    private _buildDeleteQuery;
    private _buildWhereClause;
    private _buildWhereGroupSql;
    private _buildConditionSql;
}
//# sourceMappingURL=sql-generator.d.ts.map