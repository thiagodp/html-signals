import { addAnyPolyfillToAbortSignalIfNeeded, createAbortController, destroyAbortController, signal } from './abortion.js';
import { registerSubmitEvent } from './form.js';
import { makeFunction } from './function.js';
import { extractHeaders } from './headers.js';
import { parseBoolean, parseUnquotedJSON } from './parser.js';
import { collectSenderProperties } from './properties.js';
import { Options, SenderProperties, Win } from './types.js';
import { EVENT_DOM_LOADED, EVENT_FETCH_SUCCESS } from './events.js';

// FETCH OPTIONS

let timeout: number = 5000;

// PROPERTIES

const allowedPropMap = {
    'text': 'innerText',
    'html': 'innerHTML',
    'number': 'innerText',
    'int': 'innerText',
    'float': 'innerText',
    'boolean': 'innerText'
};

const booleanProps = [
    'allowfullscreen',
    'async',
    'autofocus',
    'autoplay',
    'checked',
    'controls',
    'default',
    'defer',
    'disabled',
    'formnovalidate',
    'inert',
    'ismap',
    'itemscope',
    'loop',
    'multiple',
    'muted',
    'nomodule',
    'novalidate',
    'open',
    'playsinline',
    'readonly',
    'required',
    'reversed',
    'selected',
    'shadowrootclonable',
    'shadowrootdelegatesfocus',
    'shadowrootserializable'
];


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
    options!.window = ( options?.window || globalThis ) as Win;
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

        const doc = ( options.document || options.window?.document ) as any;
        if ( ! doc ) {
            throw new Error( 'Please define \'document\' or \'window\' in the options object' );
        }

        sendOn = EVENT_DOM_LOADED; // Custom Event

        // When the DOM is loaded, it will dispatch the custom event - that will be listened by the element
        doc.addEventListener( 'DOMContentLoaded', () => {
            const ev = new CustomEvent( EVENT_DOM_LOADED );
            el.dispatchEvent( ev );
        }, { signal } );

    }

    senderProps.sendOn = sendOn; // Just to sync values

    el.addEventListener( sendOn,
        makeEventThatMakesTargetsToReceiveTheProperty( root, senderProps, options ),
        { signal, once: senderProps.sendOnce || false }
    );
}


function makeEventThatMakesTargetsToReceiveTheProperty( root, props: SenderProperties, options?: Options ) {
    return event => {
        if ( props.prevent ) {
            event.preventDefault();
            event.stopPropagation();
        }
        const sender = event.target;
        configureTargetsToReceive( sender, root, props, options );
    };
}



function configureTargetsToReceive( sender, root, props: SenderProperties, options?: Options ) {

    // console.log( props );

    let { sendReturn, sendProp, sendElement, sendAs, sendOn, sendTo } = props;

    const { addToHistoryBeforeElements, addToHistoryAfterElements, targets } = evaluateHistory( sendTo );
    sendTo = targets; // sendTo without $history

    const onSendError = sender.getAttribute( 'on-send-error' ) || undefined;
    const onSendErrorFn: Function | undefined = makeFunction( onSendError );

    let content;

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

    } else if ( sendReturn !== undefined ) {

        const func: Function|undefined = makeFunction( '() => ' + sendReturn );
        if ( ! func ) {
            throw new Error( `Could not parse the code defined in "${sender.tagName.toLowerCase()}": ${sendReturn}` );
        }
        try {
            content = func();
        } catch ( error ) {
            if ( onSendErrorFn ) {
                onSendErrorFn( error, sender );
            } else {
                console.log( 'Error executing function: ' + error.message );
            }
            return;
        }

        // It will continue
    } else {

        // send-prop
        sendProp = sendProp ? sendProp.trim().toLowerCase() : '';
        sendProp = allowedPropMap[ sendProp ] || sendProp; // Allow unmapped properties

        // Get content
        content = sender[ sendProp! ];
        if ( content === undefined ) {
            // Use 'textContent' if 'innerText' is not available
            if ( sendProp === 'innerText' || sendProp === 'text' ) {
                content = sender[ 'textContent' ];
            // Use "data-" attributes
            } else if ( 'getAttribute' in sender ) {
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
        } else if ( sendAs === 'boolean' ) {
            content = parseBoolean( content );
        }

    }


    // send-as=fetch-*
    if ( [ 'fetch-html', 'fetch-html-js', 'fetch-json', 'fetch-text', 'fetch-blob' ].includes( sendAs! )
        && options?.fetch ) {

        const isJSON = sendAs === 'fetch-json';
        const isBlob = sendAs === 'fetch-blob';

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
                if ( isJSON ) {
                    return response.json();
                }
                return isBlob ? response.blob() : response.text();
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

                    return data;
                }

                return handleHistoryAndTargets( root, data, sendTo, { before: addToHistoryBeforeElements, after: addToHistoryAfterElements }, options );
            } )
            .then( content => {
                // Useful for testing purposes
                const ev = new options.window!.CustomEvent( EVENT_FETCH_SUCCESS, { detail: { content } } );
                sender.dispatchEvent( ev );
            } )
            .catch( error => {
                if ( onSendErrorFn ) {
                    onSendErrorFn( error, sender );
                } else if ( 'innerText' in sender ) {
                    sender.innerText = error.message;
                } else if ( 'textContent' in sender ) {
                    sender.textContent = error.message;
                } else {
                    console.error( error.message );
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

    return content;
}


function sendContentToTargetsIfSendOnIsSetToReceive( root, targetElement, content, options?: Options ) {

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

    // console.log( targetElement.tagName, ' will receive', content );

    let receiveAs = targetElement.getAttribute( 'receive-as' )?.trim() || 'text';
    receiveAs = allowedPropMap[ receiveAs.toLowerCase() ] || receiveAs; // Allow unmapped properties

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
    } else if ( receiveAs === 'boolean' ) {
        content = parseBoolean( content );
    }
    // receiveAs with fetch-*
    else if ( [ 'fetch-html', 'fetch-html-js', 'fetch-json', 'fetch-text', 'fetch-blob' ].includes( receiveAs ) && options?.fetch ) {

        const isJSON = receiveAs === 'fetch-json';
        const isHTML = receiveAs === 'fetch-html';
        const isBlob = receiveAs === 'fetch-blob';

        const prop = isBlob ? 'src' : ( isHTML ? 'innerHTML' : 'innerText' );

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
                if ( isBlob ) {
                    return response.blob();
                }
                return isJSON ? response.json() : response.text();
            } )
            .then( data => {

                if ( receiveAs === 'fetch-html-js' ) {
                    sendAsDOMToTarget( data, targetElement );
                    return data;
                }

                if ( isBlob ) {
                    targetElement[ prop ] = options.window!.URL.createObjectURL( data );
                } else if ( isJSON ) {
                    targetElement[ prop ] = JSON.stringify( data );
                } else {
                    if ( isHTML && typeof options?.sanitizer === 'function' ) {
                        targetElement[ prop ] = options.sanitizer( data.toString() );
                    } else {
                        targetElement[ prop ] = data.toString();
                    }
                }

                return sendContentToTargetsIfSendOnIsSetToReceive( root, targetElement, targetElement[ prop ] , options );
            } )
            .then( content => {
                // Useful for testing
                const ev = new options.window!.CustomEvent( EVENT_DOM_LOADED, { detail: { content } } );
                targetElement.dispatchEvent( ev );
            } )
            .catch( error => {
                if ( onReceiveErrorFn ) {
                    onReceiveErrorFn( error, targetElement );
                } else if ( prop in targetElement ) {
                    targetElement[ prop ] = error.message;
                } else if ( targetElement.getAttribute( prop ) !== null ) {
                    targetElement.setAttribute( prop, error.message );
                } else {
                    console.error( error.message );
                }
            } );

    } else if ( [ 'src', 'blob', 'image', 'video', 'audio' ].includes( receiveAs ) ) {

        targetElement[ 'src' ] = options?.window?.URL.createObjectURL( content );

        if ( targetElement.tagName === 'SOURCE' ) {
            targetElement.parentElement?.load();
        } else if ( targetElement.tagName === 'AUDIO' || targetElement.tagName === 'VIDEO' ) {
            targetElement.load();
        }

    } else if ( receiveAs === 'innerHTML' && typeof options?.sanitizer === 'function' ) {
        targetElement[ receiveAs ] = options.sanitizer( content.toString() );
    } else if ( booleanProps.includes( receiveAs ) ) {
        targetElement[ receiveAs ] = !!content;
    } else {
        targetElement[ receiveAs ] = content?.toString();
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
