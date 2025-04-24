import { callFunction, makeFunction } from "./function.js";

let observer: MutationObserver | undefined;
let observedElements: Set< Node > | undefined; // Since MutationObserver does not have a unobserve() method yet :(


export function getMutationObserver(): MutationObserver {
    if ( observer ) {
        return observer;
    }
    observer = new MutationObserver( mutationCb );
    observedElements = new Set< Node >();
    return observer;
}


export function freeMutationObserver(): void {
    if ( observer ) {
        observedElements?.clear();
        observer.disconnect();
    }
    observedElements = undefined;
    observer = undefined;
}


export function addElementToObservedMutations( ...elements: Node[] ): void {
    const observer = getMutationObserver();
    for ( const e of elements ) {
        observedElements?.add( e );
        observer.observe( e, { subtree: true, attributes: true } );
    }
}


export function removeElementFromObservedMutations( ...elements: Node[] ): void {
    getMutationObserver(); // Just to make sure to create observedElements
    for ( const e of elements ) {
        observedElements?.delete( e );
    }
}


const mutationCb: MutationCallback = ( mutations: MutationRecord[], observer: MutationObserver ) => {
    for ( const mut of mutations ) {

        const target = mut.target;

        // Ignore unobserved elements
        if ( ! observedElements?.has( mut.target ) ) {
            continue;
        }

        // Stop observing the element after it changes
        // TODO: make it optional
        observedElements.delete( target );

        // Get "on-mutate" callback
        const onMutate = ( target as HTMLElement ).getAttribute( 'on-mutate' );
        if ( ! onMutate ) {
            continue;
        }

        // Get "on-mutate-error" callback
        const onMutateError = ( target as HTMLElement ).getAttribute( 'on-mutate-error' );
        const onMutateErrorFn: Function | undefined = onMutateError ? makeFunction( onMutateError ) : undefined;

        // Call the "on-mutate" callback
        callFunction( onMutate, [], onMutateErrorFn, target );
    }
};
