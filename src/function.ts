import { parseFunction } from "./parser";

/**
 * Call a function declared as string and forward any exception to an error callback.
 *
 * @param functionString Function declaration as string.
 * @param functionArguments Array with function arguments, if any.
 * @param errorCallback Error callback
 * @param target Target element (optional)
 * @returns `undefined` in case of error or the function's returned value.
 */
export function callFunction(
    functionString: string,
    functionArguments: any[] = [],
    errorCallback?: Function,
    target?: any
): any {
    const f = makeFunction( functionString );
    if ( ! f ) {
        return;
    }
    try {
        return f( ...functionArguments );
    } catch ( error ) {
        if ( errorCallback ) {
            errorCallback( error, target );
        }
    }
}

/**
 * Make a function from a function string.
 *
 * @param functionString Function string.
 * @returns
 */
export function makeFunction( functionString?: string ): Function|undefined {
    if ( ! functionString ) {
        return;
    }
    const r = parseFunction( functionString );
    if ( ! r ) {
        return;
    }
    const { parameters, body } = r;
    return new Function( ...parameters, body );
}
