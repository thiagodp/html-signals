import { addAnyPolyfillToAbortSignalIfNeeded, createAbortController, destroyAbortController, signal } from './abortion.js';
import { registerSubmitEvent } from './form.js';
import { makeFunction } from './function.js';
import { extractHeaders } from './headers.js';
import { parseUnquotedJSON } from './parser.js';
import { collectSenderProperties } from './properties.js';
import { Options, SenderProperties } from './types.js';

// Fetch timeout
let timeout: number = 5000;


const allowedPropMap = { 'text': 'innerText', 'html': 'innerHTML' };


/**
 * Unregister the new behavior for your HTML elements, and cancel all ongoing fetch events eventually started by them.
 */
export function unregister(): void {
    destroyAbortController();
}


/**
 * Register new behavior for your HTML elements.
 *
 * @param root Element in which your HTML elements with extended properties will be declared. By default, it is `document.body`.
 * @param options Object with some options, such as:
 *  - `sanitizer?: ( html: string ) => string` function for sanitizing HTML values.
 */
export function register( root?: HTMLElement, options?: Options ): void {

    options = options || {};
    options!.window = options?.window || globalThis;
    options!.fetch = options?.fetch || globalThis.fetch.bind( globalThis );

    addAnyPolyfillToAbortSignalIfNeeded( options!.window );

    root = root || options?.document?.body || options.window?.document?.body;

    if ( ! root ) {
        throw new Error( 'Please define the root element.' );
    }

    unregister();
    const { signal } = createAbortController( options.window );

    const elements = new Set( root.querySelectorAll( '[send-to],[send],form[send-as],form[method=DELETE],form[method=PUT],form[method=PATCH]' ) );
    for ( let el of elements ) {
        configureSender( root, el, signal, options );
    }
}


function configureSender( root, el: Element, signal, options: Options ) {

    const senderProps = collectSenderProperties( el );
    if ( ! senderProps ) {
        console.error( 'Not enough sender props.' );
        return;
    }

    let sendOn  = senderProps.sendOn?.trim().toLowerCase();
    if ( ! sendOn || sendOn === 'receive' ) { // Not a valid DOM event -> skip the event listener
        return;
    }

    if ( sendOn === 'submit' && el.tagName === 'FORM' ) {
        registerSubmitEvent( el, signal, senderProps, options, timeout );
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
    } else if ( sendAs === 'number' ) {
        content = Number( content );
    } else if ( sendAs === 'int' ) {
        content = parseInt( content );
    } else if ( sendAs === 'float' ) {
        content = parseFloat( content );
    }


    const onSendError = sender.getAttribute( 'on-send-error' ) || undefined;
    const onSendErrorFn: Function | undefined = makeFunction( onSendError );

    // fetch-*
    if ( [ 'fetch-html', 'fetch-html-js', 'fetch-json', 'fetch-text' ].includes( sendAs! )  && options?.fetch ) {

        const isJSON = sendAs === 'fetch-json';
        const isHTML = sendAs === 'fetch-html';
        const prop = isHTML ? 'innerHTML' : 'innerText';

        const fetchOptions: RequestInit = {
            signal: AbortSignal['any']( [ signal!, AbortSignal.timeout( timeout ) ] ),
            credentials: 'include',
        };

        const headers = extractHeaders( sender.getAttribute( 'headers' ) );
        if ( headers ) {
            fetchOptions.headers = headers;
        }

        return options!.fetch( content, fetchOptions )
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

    // const sendOn = targetElement.getAttribute( 'send-on' )?.trim().toLowerCase();
    // if ( sendOn !== 'receive' ) {
    //     return;
    // }

    // console.log( targetElement, targetElement.id );

    // The current target element will send to its targets
    const senderProps = collectSenderProperties( targetElement );

    if ( senderProps?.sendOn !== 'receive' ) {
        return;
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
            content = onReceiveFn( content, { ...options } );
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
    } else if ( receiveAs === 'number' && typeof content !== 'number' ) {
        content = Number( content );
    } else if ( receiveAs === 'int' && typeof content !== 'number' ) {
        content = parseInt( content );
    } else if ( receiveAs === 'float' && typeof content !== 'number' ) {
        content = parseFloat( content );
    }

    // receiveAs with fetch-*
    if ( [ 'fetch-html', 'fetch-html-js', 'fetch-json', 'fetch-text' ].includes( receiveAs ) && options?.fetch ) {

        const isJSON = receiveAs === 'fetch-json';
        const isHTML = receiveAs === 'fetch-html';
        const prop = isHTML ? 'innerHTML' : 'innerText';

        const fetchOptions: RequestInit = {
            signal: AbortSignal['any']( [ signal!, AbortSignal.timeout( timeout ) ] ),
            credentials: 'include',
        };

        const headers = extractHeaders( targetElement.getAttribute( 'headers' ) );
        if ( headers ) {
            fetchOptions.headers = headers;
        }

        return options.fetch( content, fetchOptions )
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


function evaluateHistory( targets?: string ) {
    if ( ! targets ) {
        return {};
    }
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
