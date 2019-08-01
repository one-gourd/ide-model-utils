import {
    types,
    IAnyType,
    IAnyModelType
} from 'mobx-state-tree';

import { pick } from 'ide-lib-utils';

import { debugModel } from '../lib/debug';

import { SPECIAL_PROP } from './constants';
import { createGetterMethods, createSetterMethods, updateInScope } from './util';
/* ----------------------------------------------------
    属性名转换：诸如将 `formData` 更改成 `_formData`
----------------------------------------------------- */
function nameMapper(typeName: string, propName: string) {
    if (!!~SPECIAL_PROP.indexOf(typeName)) {
        return `_${propName}`;
    }

    return propName;
}

// 定义类型
export type TModelPropsObject = { [key: string]: IAnyType };
/**
 * 转换属性名
 * 对于 JSONModel 等特殊类型，属性名需要更改（一般是添加 `_` 前缀）
 * 比如 `formData` 是 JSONModel 类型，那么生成的 mst 模型属性使用 `_formData`
 * 这样是为了方便生成 `get fromData(){}` 方法，让调用方比较方便
 *
 * @param {TModelPropsObject} modelProps
 * @returns
 */
export function convertProps(modelProps: TModelPropsObject) {
    const result: TModelPropsObject = {};
    for (const propName in modelProps) {
        if (modelProps.hasOwnProperty(propName)) {
            const prop = modelProps[propName];
            const typeName = prop.name;

            // 如果没有匹配到转换函数，则使用官方的 cast 方法
            const convertedPropName = nameMapper(typeName, propName);
            result[convertedPropName] = prop;
        }
    }
    return result;
}


/**
 * 根据 props 定义快速生成 mst 模型
 * 该功能是通用型的，主要是为了简化 mst 模型的创建
 * @param modelName - 模型名
 * @param modelProps - mst 属性定义
 */
export const quickInitModel: (
    modelName: string,
    modelProps: Record<string, IAnyType>
) => IAnyModelType = (modelName, modelProps) => {
    const controlledKeys = Object.keys(modelProps);
    const convertedModelProps = convertProps(modelProps);
    return types
        .model(modelName, convertedModelProps)
        .views(self => {
            return createGetterMethods(self, modelProps);
        })
        .views(self => {
            return {
                /**
                 * 只返回当前模型的属性，可以通过 filter 字符串进行属性项过滤
                 */
                allAttibuteWithFilter(filterArray: string | string[] = controlledKeys) {
                    const filters = [].concat(filterArray || []);
                    return pick(self, filters);
                }
            };
        })
        .actions(self => {
            return createSetterMethods(self, modelProps);
        })
        .actions(self => {
            return {
                updateAttribute(name: string, value: any) {
                    debugModel(
                        `[updateAttribute] 将要更新 ${self.id ||
                        modelName} 中属性 ${name} 值为 ${JSON.stringify(
                            value
                        )}; (control keys: ${controlledKeys})`
                    );
                    return updateInScope(controlledKeys)(self, name, value);
                }
            };
        });
};
