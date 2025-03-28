import { parseUnquotedJSON } from "./parser";
import { createAbortController, destroyAbortController, signal, addAnyPolyfillToAbortSignalIfNeeded } from "./abortion";
import { makeFunction } from "./function";

// declare var window: Window & typeof globalThis;

type SanitizerFunction = ( content: string ) => string;

type GenericFetch = ( input: any, init?: any ) => Promise< any >;

export type Options = {
    window?: typeof globalThis | Window,
    document?: Document,
    fetch?: typeof globalThis.fetch | GenericFetch,
    sanitizer?: SanitizerFunction,
};


export type SenderProperties = {
    sendProp?: string,
    sendElement?: string,
    sendAs?: string,
    sendOn?: string,
    sendTo: string,
    prevent?: string | boolean,
    onSendError?: string
}

export type ReceiverProperties = {
    onReceive?: string,
    receiveAs?: string,
    onReceiveError?: string
}

// Fetch timeout
let timeout: number = 5000;



export function unregister(): void {
    destroyAbortController();
}


export function register( root?: HTMLElement, options?: Options ): void {

    options = options || {};
    options!.window = options?.window || globalThis;
    options!.fetch = options?.fetch || globalThis.fetch.bind( globalThis );

    root = root || options?.document?.body || options.window?.document?.body;

    if ( ! root ) {
        throw new Error( 'Please define the root element.' );
    }

    unregister();
    const { signal } = createAbortController( options.window );

    const elements = root.querySelectorAll( '[send-to]' );
    for ( let el of elements ) {

        const sendProp = el.getAttribute( 'send-prop' ) || undefined;
        const sendElement = el.getAttribute( 'send-element' ) || undefined;
        let sendOn = el.getAttribute( 'send-on' );
        const sendTo = el.getAttribute( 'send-to' );
        const sendAs = el.getAttribute( 'send-as' ) || undefined;

        const prevent = el.getAttribute( 'prevent' ) !== null ? true : undefined;

        if ( sendProp && sendElement ) {
            throw new Error( 'Element "' + el.tagName + '" must not declare both "send-prop" and "send-element".' );
        }

        if ( ! sendOn || ! sendTo || ( ! sendProp && ! sendElement ) ) {
            continue;
        }

        // TODO: allow abort signal to unregister all events

        sendOn = sendOn.trim().toLowerCase();
        if ( sendOn === 'change' || sendOn === 'click' || sendOn === 'domcontentloaded' || sendOn === 'blur' || sendOn === 'focus' ) {

            if ( sendOn === 'domcontentloaded' ) {
                sendOn = 'DOMContentLoaded';
                el = ( options.document || options.window.document ) as any;
            }

            el.addEventListener( sendOn, makeEventToReceiveProperty( root,
                { sendProp, sendElement, sendTo, sendAs, prevent }, options ), { signal } );
        }
    }
}


function makeEventToReceiveProperty( root, { sendProp, sendElement, sendAs, sendOn, sendTo, prevent }: SenderProperties, options?: Options ) {

    return event => {

        if ( prevent ) {
            event.preventDefault();
            event.stopPropagation();
        }

        const sender = event.target;
        const allowedPropMap = { 'value': 'value', 'text': 'innerText', 'html': 'innerHTML' };

        if ( sendElement ) {

            let element = root.querySelector( sendElement );

            const targetElements = sendTo ? root.querySelectorAll( sendTo ) : [];
            for ( const target of targetElements ) {

                if ( sendAs === 'element-clone' )  {
                    if ( element.tagName === 'TEMPLATE' ) {
                        element = element.content;
                    }
                    element = element.cloneNode( true );
                }

                receive( target, element, allowedPropMap, options );
            }

            return;
        }

        const { addToHistoryBeforeElements, addToHistoryAfterElements, targets } = evaluateHistory( sendTo );
        sendTo = targets; // sendTo without $history

        // send-prop
        sendProp = sendProp ? sendProp.trim().toLowerCase() : '';
        sendProp = allowedPropMap[ sendProp ] || sendProp; // Allow unmapped properties

        // Get content
        let content = sender[ sendProp! ];
        if ( content === undefined ) {
            if ( sendProp === 'innerText' || sendProp === 'text' ) {
                content = sender[ 'textContent' ];
            } else if ( sendProp!.indexOf( 'data-' ) === 0 ) { // "data-" attributes
                content = sender.getAttribute( sendProp );
            }
        }
        if ( content === undefined ) {
            return;
        } else if ( sendAs === 'json' ) {
            content = parseUnquotedJSON( content );
        }


        const onSendError = sender.getAttribute( 'on-send-error' ) || undefined;
        const onSendErrorFn: Function | undefined = makeFunction( onSendError );

        // fetch-*
        if ( [ 'fetch-html', 'fetch-html-js', 'fetch-json', 'fetch-text' ].includes( sendAs! )  && options?.fetch ) {

            const isJSON = sendAs === 'fetch-json';
            const isHTML = sendAs === 'fetch-html';
            const prop = isHTML ? 'innerHTML' : 'innerText';

            addAnyPolyfillToAbortSignalIfNeeded( options.window );

            return options!.fetch( content, { signal: AbortSignal['any']( [ signal!, AbortSignal.timeout( timeout ) ] ) } )
                .then( response => {
                    if ( ! response.ok ) {
                        throw new Error( 'Error fetching content from "' + content + '". Status: ' + response.status );
                    }
                    return isJSON ? response.json() : response.text();
                } )
                .then( data => {

                    if ( sendAs === 'fetch-html-js' ) {

                        // History - before
                        if ( addToHistoryBeforeElements && options?.window ) {
                            options.window.history.pushState( null, '', content );
                        }

                        // Add the DOM to the first element only - scripts executed once.
                        const targetElement = sendTo ? root.querySelector( sendTo ) : undefined;
                        if ( targetElement ) {
                            sendAsDOMToTarget( data, targetElement );
                        }

                        // History - after
                        if ( addToHistoryAfterElements && options?.window ) {
                            options.window.history.pushState( null, '', content );
                        }

                        return;
                    }

                    return handleHistoryAndTargets( root, allowedPropMap, data, sendTo, { before: addToHistoryBeforeElements, after: addToHistoryAfterElements }, options );
                } )
                .catch( error => {
                    if ( onSendErrorFn ) {
                        onSendErrorFn( error, sender );
                    } else {
                        sender[ prop ] = error.message;
                    }
                } );

            // try {
            //     const response = await options?.fetch( content, { signal: AbortSignal.any( [ signal, AbortSignal.timeout( timeout ) ] ) } );
            //     if ( ! response.ok ) {
            //         throw new Error( 'Error fetching content from "' + content + '". Status: ' + response.status );
            //     }
            //     const data = isJSON ? await response.json() : await response.text();
            //     await handleHistoryAndTargets( root, allowedPropMap, data, sendTo, { before: addToHistoryBeforeElements, after: addToHistoryAfterElements }, options );
            // } catch ( error ) {
            //     if ( errorFn ) {
            //         errorFn( error, sender );
            //     } else {
            //         sender[ prop ] = error.message;
            //     }
            // }

        } else {
            return handleHistoryAndTargets( root, allowedPropMap, content, sendTo, { before: addToHistoryBeforeElements, after: addToHistoryAfterElements }, options );
        }
    };
}


function handleHistoryAndTargets( root, allowedPropMap, content, targets, { before, after }, options?: Options ) {

    // History
    if ( before && options?.window ) {
        options.window.history.pushState( null, '', content );
    }

    // Select target elements and send the content
    const targetElements = targets ? root.querySelectorAll( targets ) : [];
    for ( const el of targetElements ) {
        receive( el, content, allowedPropMap, options );
    }

    // History
    if ( after && options?.window ) {
        options.window.history.pushState( null, '', content );
    }
}




function receive( target, content, allowedPropMap, options?: Options ) {

    let receiveAs = target.getAttribute( 'receive-as' );
    if ( ! receiveAs ) {
        return; // Nothing to do
    }
    receiveAs = receiveAs.trim().toLowerCase();
    receiveAs = allowedPropMap[ receiveAs ] || receiveAs; // Allow unmapped properties

    const onReceiveError = target.getAttribute( 'on-receive-error' ) || undefined;
    const onReceiveErrorFn: Function | undefined = makeFunction( onReceiveError );

    const onReceive = target.getAttribute( 'on-receive' ) || undefined;
    const onReceiveFn: Function | undefined = makeFunction( onReceive );
    if ( onReceiveFn ) {
        try {
            // console.log( 'WILL RUN on-receive', '\n\tbefore:', content );
            content = onReceiveFn( content );
            // console.log( '\tafter:', content );
        } catch ( error ) {
            if ( onReceiveErrorFn ) {
                onReceiveErrorFn( error, target );
            } else {
                target[ receiveAs ] = error.message;
            }
            // console.error( error );
            return; // stop on error
        }
    }

    if ( receiveAs === 'element' || receiveAs === 'element-clone' ) {

        if ( typeof content !== 'object' ) {
            throw new Error( 'content to be cloned is not an object' );
        }

        if ( receiveAs === 'element-clone' ) {
            if ( content.tagName === 'TEMPLATE' ) {
                content = content.content;
            }
            content = content.cloneNode( true );
        }

        target.append( content );
        return;
    }

    // fetch-*
    if ( [ 'fetch-html', 'fetch-html-js', 'fetch-json', 'fetch-text' ].includes( receiveAs ) && options?.fetch ) {

        const isJSON = receiveAs === 'fetch-json';
        const isHTML = receiveAs === 'fetch-html';
        const prop = isHTML ? 'innerHTML' : 'innerText';

        addAnyPolyfillToAbortSignalIfNeeded( options.window );

        return options.fetch( content, { signal: AbortSignal['any']( [ signal!, AbortSignal.timeout( timeout ) ] ) } )
            .then( response => {
                if ( ! response.ok ) {
                    throw new Error( 'Error fetching content from ' + content + '. HTTP status: ' + response.status );
                }
                return isJSON ? response.json() : response.text();
            } )
            .then( data => {

                if ( receiveAs === 'fetch-html-js' ) {
                    sendAsDOMToTarget( data, target );
                    return;
                }

                if ( typeof options?.sanitizer === 'function' ) {
                    target[ prop ] = options.sanitizer( data );
                } else {
                    target[ prop ] = isJSON ? JSON.stringify( data ) : data.toString();
                }

            } )
            .catch( error => {
                if ( onReceiveErrorFn ) {
                    onReceiveErrorFn( error, target );
                } else {
                    target[ prop ] = error.message;
                }
            } );

        // try {
        //     const response = await options?.fetch( content, { signal: AbortSignal.any( [ signal, AbortSignal.timeout( timeout ) ] ) } );
        //     if ( ! response.ok ) {
        //         throw new Error( 'Error fetching content from "' + content + '". Status: ' + response.status );
        //     }
        //     const data = isJSON ? await response.json() : await response.text();
        //     if ( typeof options?.sanitizer === 'function' ) {
        //         target[ prop ] = options.sanitizer( data );
        //     } else {
        //         target[ prop ] = isJSON ? JSON.stringify( data ) : data.toString();
        //     }
        // } catch ( error ) {
        //     if ( errorFn ) {
        //         errorFn( error, target );
        //     } else {
        //         target[ prop ] = error.message;
        //     }
        // }
        // return;
    }

    if ( receiveAs === 'innerHTML' && typeof options?.sanitizer === 'function' ) {
        target[ receiveAs ] = options.sanitizer( content );
        return;
    }

    target[ receiveAs ] = content.toString();
}


function sendAsDOMToTarget( html: string, target: HTMLElement ): void {

    const domParser = new DOMParser();
    const doc = domParser.parseFromString( html, 'text/html' ); // throws
    const scripts = doc.querySelectorAll( 'script' );

    // Remove the scripts from the loaded document
    for ( const script of scripts ) {
        doc.body.removeChild( script );
    }

    // Remove the current content from the target
    while ( target.lastChild ) {
        target.removeChild( target.lastChild );
    }

    // Add the content without the scripts to the target
    target.appendChild( doc.body );

    // Copy all script tags and insert at the target element
    for ( const script of scripts ) {

        // // Remove the script from the target element if it already exists
        // if ( script.id ) {
        //     const existingScript = target.querySelector( 'script#' + script.id );
        //     if ( existingScript ) {
        //         target.removeChild( existingScript );
        //         existingScript.remove();
        //     }
        // }

        // Create a copy
        const newScript = document.createElement( 'script' );
        newScript.id = script.id;
        newScript.type = script.type;
        newScript.defer = script.defer;
        if ( script.src ) {
            newScript.src = script.src;
        }
        newScript.textContent = script.textContent;

        // Add the copy to the target element
        target.appendChild( newScript );

        // Remove the original script
        script.remove();
    }

}


function evaluateHistory( targets: string ) {
    const historyResult = /[ ]*,?[ ]*\$history/i.exec( targets );
    let addToHistoryBeforeElements = false;
    let addToHistoryAfterElements = false;
    if ( historyResult ) {
        const lcTargets = targets.toLowerCase();
        // Remove from targets
        targets = targets.replace( historyResult[ 0 ], '' );
        // Evaluate when to add to history
        const history = '$history';
        addToHistoryBeforeElements = lcTargets.startsWith( history );
        if ( ! addToHistoryBeforeElements ) {
            addToHistoryAfterElements = lcTargets.endsWith( history );
        }
    }
    return { addToHistoryBeforeElements, addToHistoryAfterElements, targets };
}