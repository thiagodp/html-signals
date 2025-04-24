import { callFunction, makeFunction } from "./function.js";

let observer: IntersectionObserver | undefined;


export function getIntersectionObserver(): IntersectionObserver {
    if ( observer ) {
        return observer;
    }
    observer = new IntersectionObserver( intersectionCb );
    return observer;
}


export function freeIntersectionObserver(): void {
    if ( observer ) {
        observer.disconnect();
    }
    observer = undefined;
}


export function addElementToObservedIntersections( ...elements: Element[] ): void {
    const observer = getIntersectionObserver();
    for ( const e of elements ) {
        observer.observe( e );
    }
}


export function removeElementFromObservedIntersections( ...elements: Element[] ): void {
    const observer = getIntersectionObserver();
    for ( const e of elements ) {
        observer.unobserve( e );
    }
}


const intersectionCb: IntersectionObserverCallback = entries => {
    for ( const entry of entries ) {

        if ( ! entry.isIntersecting ) {
            continue;
        }

        const target = entry.target;

        // Stop observing the element after it becomes visible in the viewport
        // TODO: make it optional
        observer?.unobserve( target );

        // Get "on-viewport" callback
        const onViewport = ( target as HTMLElement ).getAttribute( 'on-viewport' );
        if ( ! onViewport ) {
            continue;
        }

        // Get "on-viewport-error" callback
        const onViewportError = ( target as HTMLElement ).getAttribute( 'on-viewport-error' );
        const onViewportErrorFn: Function | undefined = onViewportError ? makeFunction( onViewportError ) : undefined;

        // Call the "on-viewport" callback
        callFunction( onViewport, [], onViewportErrorFn, target );
    }
};
