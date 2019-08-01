import {
    cast,
    IAnyType,
} from 'mobx-state-tree';
import { capitalize, invariant } from 'ide-lib-utils';

import { debugModel } from '../lib/debug';
import { IAnyModelInstance, TAnyFunction, SPECIAL_PROP } from "./constants";
import { NAME_JSON_MODEL } from './json-model';

/* ----------------------------------------------------
    getter 方法生成
----------------------------------------------------- */
const getterDescriptorMapper: Record<
    string,
    (
        modelInstance: IAnyModelInstance,
        propName: string
    ) => TypedPropertyDescriptor<any>
> = {};
getterDescriptorMapper[NAME_JSON_MODEL] = function (
    modelInstance: IAnyModelInstance,
    propName: string
) {
    return {
        get: function () {
            return modelInstance[`_${propName}`].value;
        }
    };
};


/**
 * 根据 model props 自动创建对于的 getter 方法
 * 比如 `props` 中有 `formData` 属性，如果该属性是 JSON Model，则会自动创建出 `get formData(){}` 的 getter
 * （对应的 model 属性则是 `_formData`）
 *
 *
 * @param {IAnyModelInstance} modelInstance - mst 实例
 * @param {Record<string, IAnyType>} modelProps - props 对象
 * @returns
 */
export function createGetterMethods(
    modelInstance: IAnyModelInstance,
    modelProps: Record<string, IAnyType>
) {
    const result: Record<string, TAnyFunction> = {};
    for (const propName in modelProps) {
        if (modelProps.hasOwnProperty(propName)) {
            const prop = modelProps[propName as keyof typeof modelProps];
            const typeName = prop.name;

            // 存在特殊 prop 类型时，需要定义特定的 view 视图
            if (
                !!~SPECIAL_PROP.indexOf(typeName) &&
                getterDescriptorMapper[typeName]
            ) {
                // 注意不能仅使用 `defineProperty`，不然 mobx.getMembers(mst) 是看不到你定义的属性出现在 views 属性中的
                // 需要先用 undefined 进行占位
                result[propName] = void 0;
                Object.defineProperty(
                    result,
                    propName,
                    getterDescriptorMapper[typeName](modelInstance, propName)
                );
            }
        }
    }
    return result;
}



/* ----------------------------------------------------
    setter 方法生成
----------------------------------------------------- */
/**
 * 类型转换函数，简化 mst 的赋值操作
 */
const normalSetterMapper: Record<string, (val: any) => any> = {
    integer: (val: any) => {
        return parseInt(val);
    },
    number: (val: any) => {
        return parseFloat(val);
    },
    boolean: (val: any) => {
        return val === 'true' || val === true;
    },
    Date: (val: any) => {
        return new Date(val);
    }
};

// 特殊 setter 映射
const specialSetterMapper: Record<
    string,
    (modelInstance: IAnyModelInstance, propName: string) => (val: any) => any
> = {};

specialSetterMapper[NAME_JSON_MODEL] = (
    modelInstance: IAnyModelInstance,
    propName: string
) => (val: any) => {
    return modelInstance[`_${propName}`].setValue(val);
};

const getMappedSetter = function (
    typeName: string,
    modelInstance: IAnyModelInstance,
    propName: string
) {
    if (!!~SPECIAL_PROP.indexOf(typeName)) {
        invariant(
            !!specialSetterMapper[typeName],
            `必须要存在 ${typeName} 的 setter 映射函数`
        );
        return specialSetterMapper[typeName](modelInstance, propName);
    }

    const setterFn = normalSetterMapper[typeName] || cast;
    return function (val: any) {
        modelInstance[propName] = setterFn(val);
    };
};

/**
 * 根据 model props 自动创建对于的 setter 方法
 * 比如 `props` 中有 `visible` 属性，则会自动创建出 `setVisible` 的 setter
 *
 * @param {IAnyModelInstance} modelInstance
 * @param {Record<string, IAnyType>} modelProps
 * @returns
 */
export function createSetterMethods(
    modelInstance: IAnyModelInstance,
    modelProps: Record<string, IAnyType>
) {
    const result: Record<string, TAnyFunction> = {};
    for (const propName in modelProps) {
        if (modelProps.hasOwnProperty(propName)) {
            const prop = modelProps[propName as keyof typeof modelProps];
            const typeName = prop.name;
            const fnName = `set${capitalize(propName)}`;

            // 匹配到转换函数
            result[fnName] = getMappedSetter(typeName, modelInstance, propName);
        }
    }
    return result;
}

/* ----------------------------------------------------
    更新 item 中指定 enum 的属性
----------------------------------------------------- */
export const updateInScope = (valueSet: string[]) => (
    item: any,
    attrName: string,
    value: any
): boolean => {
    invariant(!!item, '入参 item 必须存在');
    // 如果不是可更新的属性，那么将返回 false
    if (!valueSet.includes(attrName)) {
        debugModel(
            `[更新属性] 属性名 ${attrName} 不属于可更新范围，无法更新成 ${value} 值；（附:可更新属性列表：${valueSet}）`
        );
        return false;
    }

    const functionName = `set${capitalize(attrName)}`; // 比如 attrName 是 `type`, 则调用 `setType` 方法
    item[functionName](value);
    return true;
};