import {
    Instance,
    IAnyModelType,
} from 'mobx-state-tree';

import { NAME_JSON_MODEL } from './json-model';

export const SPECIAL_PROP = [NAME_JSON_MODEL];
export interface IAnyModelInstance extends Instance<IAnyModelType> { }
export type TAnyFunction = (...args: any[]) => void;