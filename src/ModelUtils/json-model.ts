import {
    cast,
    types,
    Instance,
    IAnyModelType,
    applySnapshot,
    SnapshotOrInstance
} from 'mobx-state-tree';


/* ----------------------------------------------------
  初始化 JSON Model 
----------------------------------------------------- */
export function createJSONInstance(obj: string | object): IJSONModel {
    const model = JSONModel.create({});
    model.setValue(obj);
    return model;
}

export const EMPTY_JSON_STRING = '{}';
export const NAME_JSON_MODEL = 'JSONModel';

export const JSONModel = types
    .model(NAME_JSON_MODEL, {
        _value: types.optional(types.string, EMPTY_JSON_STRING) // 属性 schema 描述
    })
    .views(self => {
        return {
            get value() {
                return JSON.parse(self._value);
            }
        };
    })
    .actions(self => {
        return {
            setValue(o: string | object) {
                self._value = typeof o === 'object' ? JSON.stringify(o) : o;
            }
        };
    });
export interface IJSONModel extends Instance<typeof JSONModel> { }
export const EMPTY_JSON_INSTANCE = createJSONInstance({});
export const EMPTY_JSON_SNAPSHOT = (EMPTY_JSON_INSTANCE as any).toJSON();