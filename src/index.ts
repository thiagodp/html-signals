import { parseFunction, parseUnquotedJSON } from "./parser";


type SanitizerFunction = ( content: string ) => string;

declare var window: typeof globalThis;

type GenericFetch = ( input: any, init?: any ) => Promise< any >;

export type Options = {
    window?: typeof globalThis | Window,
    fetch?: typeof globalThis.fetch | GenericFetch,
    sanitizer?: SanitizerFunction,
};


export type SenderProperties = {
    sendWhat?: string,
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


export function register( root: HTMLElement, options?: Options ) {

    options = options || {};

    options!.window = options?.window || globalThis;
    options!.fetch = options?.fetch || globalThis.fetch.bind( globalThis );

    const elements = root.querySelectorAll( '[send-to]' );
    for ( const el of elements ) {

        const sendWhat = el.getAttribute( 'send-what' ) || undefined;
        const sendElement = el.getAttribute( 'send-element' ) || undefined;
        const sendOn = el.getAttribute( 'send-on' );
        const sendTo = el.getAttribute( 'send-to' );
        const sendAs = el.getAttribute( 'send-as' ) || undefined;

        const prevent = el.getAttribute( 'prevent' ) !== null ? true : undefined;

        if ( sendWhat && sendElement ) {
            throw new Error( 'Element "' + el.tagName + '" must not declare both "send-what" and "send-element".' );
        }

        if ( ! sendOn || ! sendTo || ( ! sendWhat && ! sendElement ) ) {
            continue;
        }

        // TODO: allow abort signal to unregister all events

        const event = sendOn.trim().toLowerCase();
        if ( event === 'change' || event === 'blur' || event === 'focus' || event === 'click' ) {
            el.addEventListener( event, makeEventToReceiveProperty( root,
                { sendWhat, sendElement, sendTo, sendAs, prevent }, options ) );
        }
    }
}


export function unregister( root: HTMLElement ) {
}


function makeEventToReceiveProperty( root, { sendWhat, sendElement, sendAs, sendOn, sendTo, prevent }: SenderProperties, options?: Options ) {

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

        // Evaluate $history
        const historyResult = /[ ]*,?[ ]*\$history/i.exec( sendTo );
        let addToHistoryBeforeElements = false;
        let addToHistoryAfterElements = false;
        if ( historyResult ) {
            const lcTargets = sendTo.toLowerCase();
            // Remove from targets
            sendTo = sendTo.replace( historyResult[ 0 ], '' );
            // Evaluate when to add to history
            const history = '$history';
            addToHistoryBeforeElements = lcTargets.startsWith( history );
            if ( ! addToHistoryBeforeElements ) {
                addToHistoryAfterElements = lcTargets.endsWith( history );
            }
        }

        // send-what
        sendWhat = sendWhat ? sendWhat.trim().toLowerCase() : '';
        sendWhat = allowedPropMap[ sendWhat ] || sendWhat; // Allow unmapped properties

        // Get content
        let content = sender[ sendWhat! ];
        if ( content === undefined ) {
            if ( sendWhat === 'innerText' || sendWhat === 'text' ) {
                content = sender[ 'textContent' ];
            } else if ( sendWhat!.indexOf( 'data-' ) === 0 ) { // "data-" attributes
                content = sender.getAttribute( sendWhat );
            }
        }
        if ( content === undefined ) {
            return;
        } else if ( sendAs === 'json' ) {
            content = parseUnquotedJSON( content );
        }


        const onSendErrorProp = sender.getAttribute( 'on-receive-error' );
        let errorFn: Function | undefined = undefined;
        if ( onSendErrorProp ) {
            const r = parseFunction( onSendErrorProp );
            if ( r ) {
                const { parameters, body } = r;
                errorFn = new Function( ...parameters, body );
            }
        }

        // fetch-*
        if ( [ 'fetch-html', 'fetch-json', 'fetch-text' ].includes( sendAs! )  && options?.fetch ) {

            const isJSON = sendAs === 'fetch-json';
            const isHTML = sendAs === 'fetch-html';
            const prop = isHTML ? 'innerHTML' : 'innerText';

            return options?.fetch( content, { signal: AbortSignal.timeout( 5000 ) } )
                .then( response => {
                    if ( ! response.ok ) {
                        throw new Error( 'Error fetching content from "' + content + '". Status: ' + response.status );
                    }
                    return isJSON ? response.json() : response.text();
                } )
                .then( data => {
                    return handleHistoryAndTargets( root, allowedPropMap, data, sendTo, { before: addToHistoryBeforeElements, after: addToHistoryAfterElements }, options );
                } )
                .catch( error => {
                    if ( errorFn ) {
                        errorFn( error, sender );
                    } else {
                        sender[ prop ] = error.message;
                    }
                } );

            // try {
            //     const response = await options?.fetch( content, { signal: AbortSignal.timeout( 5000 ) } );
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

    let receiveAsProp = target.getAttribute( 'receive-as' );
    if ( ! receiveAsProp ) {
        return; // Nothing to do
    }
    receiveAsProp = receiveAsProp.trim().toLowerCase();
    receiveAsProp = allowedPropMap[ receiveAsProp ] || receiveAsProp; // Allow unmapped properties

    const onReceiveErrorProp = target.getAttribute( 'on-receive-error' );
    let errorFn: Function | undefined = undefined;
    if ( onReceiveErrorProp ) {
        const r = parseFunction( onReceiveErrorProp );
        if ( r ) {
            const { parameters, body } = r;
            errorFn = new Function( ...parameters, body );
        }
    }

    const onReceiveProp = target.getAttribute( 'on-receive' );
    if ( onReceiveProp ) {
        const r = parseFunction( onReceiveProp );
        if ( r ) {
            const { parameters, body } = r;
            const fn = new Function( ...parameters, body );
            try {
                // console.log( 'WILL RUN on-receive', '\n\tbefore:', content );
                content = fn( content );
                // console.log( '\tafter:', content );
            } catch ( error ) {
                if ( errorFn ) {
                    errorFn( error, target );
                } else {
                    target[ receiveAsProp ] = error.message;
                }
                // console.error( error );
                return; // stop on error
            }
        }
    }

    if ( receiveAsProp === 'element' || receiveAsProp === 'element-clone' ) {

        if ( typeof content !== 'object' ) {
            throw new Error( 'content to be cloned is not an object' );
        }

        if ( receiveAsProp === 'element-clone' ) {
            if ( content.tagName === 'TEMPLATE' ) {
                content = content.content;
            }
            content = content.cloneNode( true );
        }

        target.append( content );
        return;
    }

    // fetch-*
    if ( [ 'fetch-html', 'fetch-json', 'fetch-text' ].includes( receiveAsProp ) && options?.fetch ) {

        const isJSON = receiveAsProp === 'fetch-json';
        const isHTML = receiveAsProp === 'fetch-html';
        const prop = isHTML ? 'innerHTML' : 'innerText';

        return options.fetch( content, { signal: AbortSignal.timeout( 5000 ) } )
            .then( response => {
                if ( ! response.ok ) {
                    throw new Error( 'Error fetching content from ' + content + '. HTTP status: ' + response.status );
                }
                return isJSON ? response.json() : response.text();
            } )
            .then( data => {
                if ( typeof options?.sanitizer === 'function' ) {
                    target[ prop ] = options.sanitizer( data );
                } else {
                    target[ prop ] = isJSON ? JSON.stringify( data ) : data.toString();
                }
            } )
            .catch( error => {
                if ( errorFn ) {
                    errorFn( error, target );
                } else {
                    target[ prop ] = error.message;
                }
            } );

        // try {
        //     const response = await options?.fetch( content, { signal: AbortSignal.timeout( 5000 ) } );
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

    if ( receiveAsProp === 'innerHTML' && typeof options?.sanitizer === 'function' ) {
        target[ receiveAsProp ] = options.sanitizer( content );
        return;
    }

    target[ receiveAsProp ] = content.toString();
}
