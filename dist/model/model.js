"use strict";
// src/model/model.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.Model = exports.AnyModel = void 0;
class AnyModel {
    constructor() {
        this._meta = "generated-schema";
    }
}
exports.AnyModel = AnyModel;
/**
 * Базовый класс для всех моделей Kadmium.
 */
class Model extends AnyModel {
    constructor() {
        super(...arguments);
        /** Конфигурация: хуки, валидация, фичи */
        this._conf_ = {
            hooks: {
                beforeCreate: [],
                afterCreate: [],
                beforeUpdate: [],
                afterUpdate: [],
                beforeDelete: [],
                afterDelete: [],
                beforeRead: [],
                afterRead: [],
            },
            validation: { rules: [] },
            features: [],
        };
    }
}
exports.Model = Model;
//# sourceMappingURL=model.js.map