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


const allowedPropMap = { 'text': 'innerText', 'html': 'innerHTML' };



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

    const elements = new Set( root.querySelectorAll( '[send-to],[send]' ) );
    for ( let el of elements ) {
        configureSender( root, el, signal, options );
    }
}


function collectSenderProperties( el: Element ): SenderProperties | null {

    const checkedProperties = ( { sendProp, sendElement, sendOn, sendTo, sendAs, prevent } ) => {

        if ( sendProp && sendElement ) {
            throw new Error( 'Element "' + el.tagName + '" must not declare both "send-prop" and "send-element".' );
        }

        if ( ! sendOn || ! sendTo || ( ! sendProp && ! sendElement ) ) {
            return null;
        }

        return { sendProp, sendElement, sendOn, sendTo, sendAs, prevent };
    }

    const extractElement = text => {
        const result = /^\{([^}])\}$/.exec( text ); // Example: {#foo}
        return result ? result.at( 1 ) : undefined;
    };


    const prevent = el.getAttribute( 'prevent' ) !== null ? true : undefined;

    const send = el.getAttribute( 'send' ) || undefined;
    if ( send ) {
        const [ sendProp, sendOn, sendTo, sendAs ] = send.split( '|' ).map( value => value.trim() || undefined );
        const sendElement = extractElement( sendProp );

        return checkedProperties( { sendProp: ( sendElement ? undefined : sendProp ), sendElement, sendOn, sendTo, sendAs, prevent } );
    }

    const sendProp = el.getAttribute( 'send-prop' ) || undefined;
    const sendElement = el.getAttribute( 'send-element' ) || undefined;
    const sendOn = el.getAttribute( 'send-on' ) || undefined;
    const sendTo = el.getAttribute( 'send-to' ) || undefined;
    const sendAs = el.getAttribute( 'send-as' ) || undefined;

    return checkedProperties( { sendProp, sendElement, sendOn, sendTo, sendAs, prevent } );
}


function configureSender( root, el: Element, signal, options: Options ) {

    const senderProps = collectSenderProperties( el );
    if ( ! senderProps ) {
        return;
    }

    let sendOn  = senderProps.sendOn?.trim().toLowerCase();
    if ( ! sendOn || sendOn === 'receive' ) { // Not a valid DOM event
        return;
    }

    if ( sendOn === 'domcontentloaded' ) {
        sendOn = 'DOMContentLoaded';
        el = ( options.document || options.window?.document ) as any;
        if ( ! el ) {
            throw new Error( 'Please define \'document\' or \'window\' in the options object' );
        }
    }

    senderProps.sendOn = sendOn; // Just to sync values

    el.addEventListener( sendOn, makeEventThatMakesTargetsToReceiveTheProperty( root, senderProps, options ), { signal } );
}


function makeEventThatMakesTargetsToReceiveTheProperty( root, { sendProp, sendElement, sendAs, sendOn, sendTo, prevent }: SenderProperties, options?: Options ) {
    return event => {
        if ( prevent ) {
            event.preventDefault();
            event.stopPropagation();
        }
        const sender = event.target;
        configureTargetsToReceive( sender, root, { sendProp, sendElement, sendAs, sendOn, sendTo }, options );
    };
}


function configureTargetsToReceive( sender, root, { sendProp, sendElement, sendAs, sendOn, sendTo }: SenderProperties, options?: Options ) {

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

            receive( root, target, element, options );
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
        // Use 'textContent' if 'innerText' is not available
        if ( sendProp === 'innerText' || sendProp === 'text' ) {
            content = sender[ 'textContent' ];
        // Use "data-" attributes
        } else if ( sendProp!.indexOf( 'data-' ) === 0 ) {
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

                return handleHistoryAndTargets( root, data, sendTo, { before: addToHistoryBeforeElements, after: addToHistoryAfterElements }, options );
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
        //     await handleHistoryAndTargets( root, data, sendTo, { before: addToHistoryBeforeElements, after: addToHistoryAfterElements }, options );
        // } catch ( error ) {
        //     if ( errorFn ) {
        //         errorFn( error, sender );
        //     } else {
        //         sender[ prop ] = error.message;
        //     }
        // }

    } else {
        return handleHistoryAndTargets( root, content, sendTo, { before: addToHistoryBeforeElements, after: addToHistoryAfterElements }, options );
    }
}


function handleHistoryAndTargets( root, content, targets, { before, after }, options?: Options ) {

    // History
    if ( before && options?.window ) {
        options.window.history.pushState( null, '', content );
    }

    // Select target elements and send the content
    const targetElements = targets ? root.querySelectorAll( targets ) : [];
    for ( const el of targetElements ) {
        receive( root, el, content, options );
    }

    // History
    if ( after && options?.window ) {
        options.window.history.pushState( null, '', content );
    }
}


function sendContentToTargetsIfSendOnIsSetToReceive( root, targetElement, content, options?: Options ) {

    const sendOn = targetElement.getAttribute( 'send-on' )?.trim().toLowerCase();
    if ( sendOn !== 'receive' ) {
        return;
    }
    // console.log( targetElement, targetElement.id );

    // The current target element will send to its targets
    const senderProps = collectSenderProperties( targetElement );
    if ( ! senderProps ) {
        throw new Error( 'Element with "send-on" equals to "receive" must set "send-prop" or "send-element".' );
    }

    // Select target elements and send the content
    const targets = senderProps.sendTo;
    const targetElements = targets ? root.querySelectorAll( targets ) : [];
    for ( const el of targetElements ) {
        return receive( root, el, content, options );
    }
}


function receive( root, targetElement, content, options?: Options ) {

    let receiveAs = targetElement.getAttribute( 'receive-as' )?.trim().toLowerCase() || 'text';
    receiveAs = allowedPropMap[ receiveAs ] || receiveAs; // Allow unmapped properties

    const onReceiveError = targetElement.getAttribute( 'on-receive-error' ) || undefined;
    const onReceiveErrorFn: Function | undefined = makeFunction( onReceiveError );

    const onReceive = targetElement.getAttribute( 'on-receive' ) || undefined;
    const onReceiveFn: Function | undefined = makeFunction( onReceive );
    if ( onReceiveFn ) {
        try {
            // console.log( 'WILL RUN on-receive', '\n\tbefore:', content );
            content = onReceiveFn( content );
            // console.log( '\tafter:', content );
        } catch ( error ) {
            if ( onReceiveErrorFn ) {
                onReceiveErrorFn( error, targetElement );
            } else {
                targetElement[ receiveAs ] = error.message;
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

        targetElement.append( content );

        return sendContentToTargetsIfSendOnIsSetToReceive( root, targetElement, content, options );
    }

    // receiveAs with fetch-*
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
                    sendAsDOMToTarget( data, targetElement );
                    return;
                }

                if ( typeof options?.sanitizer === 'function' ) {
                    targetElement[ prop ] = options.sanitizer( data );
                } else {
                    targetElement[ prop ] = isJSON ? JSON.stringify( data ) : data.toString();
                }

                return sendContentToTargetsIfSendOnIsSetToReceive( root, targetElement, targetElement[ prop ] , options );
            } )
            .catch( error => {
                if ( onReceiveErrorFn ) {
                    onReceiveErrorFn( error, targetElement );
                } else {
                    targetElement[ prop ] = error.message;
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
        targetElement[ receiveAs ] = options.sanitizer( content );
    } else {
        targetElement[ receiveAs ] = content.toString();
    }

    return sendContentToTargetsIfSendOnIsSetToReceive( root, targetElement, targetElement[ receiveAs ], options );
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