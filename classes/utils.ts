import {fromPairs, isNil} from "lodash";

export function compact<T>(obj: T): T {
    return fromPairs(Object.entries(obj).filter(([k, v]) => !isNil(v))) as T;
}

export function isDev(app?) {
    return (
        app ? app.get('env') === 'development'
            : process.env.NODE_ENV === undefined || process.env.NODE_ENV === 'development'
    );
}

export function isProd(app?) {
    return (
        app ? app.get('env') === 'production'
            : process.env.NODE_ENV === 'production'
    );
}
