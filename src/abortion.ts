
export let controller: any; // AbortController
export let signal: any; // AbortSignal


export function createAbortController( window?: any ) {
    window = window || globalThis;
    controller = new window.AbortController();
    signal = controller!.signal;

    return { controller, signal };
}


export function destroyAbortController() {
    if ( ! controller ) {
        return;
    }

    // Cancel all registered listeners and fetch executions (if any)
    controller.abort();

    signal = undefined;
    controller = undefined;
}


export function addAnyPolyfillToAbortSignalIfNeeded( window?: any ) {

    if ( typeof AbortSignal['any'] !== undefined ) {
        return;
    }

    window = window || globalThis;

    //
    // Polyfill - obtained from https://github.com/mo/abortcontroller-polyfill/blob/master/src/abortsignal-ponyfill.js
    //
    AbortSignal['any'] = function ( iterable ) {

        const { controller } = createAbortController( window );

        function abort() {
          controller.abort(this.reason);
          clean();
        }

        function clean() {
          for (const signal of iterable) {
            signal.removeEventListener('abort', abort);
          }
        }

        for (const signal of iterable) {
            if (signal.aborted) {
                controller.abort(signal.reason);
                break;
            }
            signal.addEventListener('abort', abort);
        }

        return controller.signal;

    };
}
