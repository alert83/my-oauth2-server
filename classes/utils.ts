import {fromPairs, isNil} from "lodash";

export function compact<T>(obj: T): T {
    return fromPairs(Object.entries(obj).filter(([k, v]) => !isNil(v))) as T;
}
