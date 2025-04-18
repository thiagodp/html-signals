import { callFunction, makeFunction } from "./function.js";

let observer: MutationObserver | undefined;
let observedElements: Set< Node > | undefined;


export function createMutationObserver(): MutationObserver {
    observer = new MutationObserver( mutationCb );
    observedElements = new Set< Node >();
    return observer;
}


export function addObservedElement( ...elements: Node[] ): void {
    if ( ! observer || ! observedElements ) {
        return;
    }
    for ( const e of elements ) {
        observedElements.add( e );
        observer.observe( e, { subtree: true } );
    }
}


const mutationCb: MutationCallback = ( mutations: MutationRecord[], observer: MutationObserver ) => {
    for ( const mut of mutations ) {
        // Ignore unobserved elements
        if ( ! observedElements?.has( mut.target ) ) {
            continue;
        }
        // Get "on-mutate" callback
        const onMutate = ( mut.target as HTMLElement ).getAttribute( 'on-mutate' );
        if ( ! onMutate ) {
            continue;
        }

        // Get "on-mutate-error" callback
        const onMutateError = ( mut.target as HTMLElement ).getAttribute( 'on-mutate-error' );
        const onMutateErrorFn: Function | undefined = onMutateError ? makeFunction( onMutateError ) : undefined;

        // Call the "on-mutate" callback
        callFunction( onMutate, [], onMutateErrorFn, mut.target );
    }
};


export function destroyMutationObserver(): void {

    if ( observer ) {
        observer.disconnect();
        observer = undefined;
    }

    if ( observedElements ) {
        observedElements.clear();
        observedElements = undefined;
    }
}
