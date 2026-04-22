"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KadmiumSqb = void 0;
const profiler_1 = require("../core/profiling/profiler");
const utils_1 = require("./utils");
/**
 * The internal, stateful query builder.
 * It accumulates query state and passes it to a DB adapter for execution.
 */
class KadmiumSqb {
    constructor(schemaCore) {
        this.schemaCore = schemaCore;
        // Internal state of the query
        this._operation = "select";
        this._tableContext = new Map();
        this._joins = [];
        this._updateData = null;
        this._wheres = { op: "AND", conditions: [] };
        this._selects = null;
        this._orders = [];
        this._includes = []; // Using the new interface
        this._limit = null;
        this._skip = null;
        this._groupBy = [];
    }
    /**
     * Creates a shallow copy of this SQB with deep-copied mutable state.
     * Used when cloning a relation builder via .as().
     */
    clone() {
        const copy = new KadmiumSqb(this.schemaCore);
        copy._operation = this._operation;
        copy._tableContext = new Map(this._tableContext);
        copy._joins = [...this._joins];
        copy._updateData = this._updateData;
        copy._wheres = (0, utils_1.cloneWhereGroup)(this._wheres);
        copy._selects = this._selects;
        copy._orders = [...this._orders];
        copy._includes = [...this._includes];
        copy._limit = this._limit;
        copy._skip = this._skip;
        copy._groupBy = [...this._groupBy];
        return copy;
    }
    /**
     * Delegates execution of the accumulated query state to a DB adapter.
     * @param adapter The database adapter that will generate and run the query.
     * @param collectionName The name of the table/collection to query.
     */
    async execute(adapter) {
        return adapter.execute(this);
    }
}
exports.KadmiumSqb = KadmiumSqb;
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], KadmiumSqb.prototype, "execute", null);
//# sourceMappingURL=kadmium-sqb.js.map