import { parseFunction, parseUnquotedJSON } from "./parser";


type SanitizerFunction = ( content: string ) => string;

export type Options = {
    window?: Window,
    fetch?: ( input: any, init?: any ) => Promise< any >
    sanitizer?: SanitizerFunction,
};


function makeEventToReceiveProperty( root, { property, targets, sendType, prevent }, options?: Options ) {

    return event => {

        if ( prevent ) {
            event.preventDefault();
            event.stopPropagation();
        }

        // Evaluate $history
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
                addToHistoryAfterElements = lcTargets.endsWithHistory( history );
            }
        }

        // Evaluate the "sender-as" property
        const prop = property ? property.trim().toLowerCase() : '';
        const allowedPropMap = { 'value': 'value', 'text': 'innerText', 'html': 'innerHTML' };
        const senderProperty = allowedPropMap[ prop ] || prop; // Allow unmapped properties
        const sender = event.target;

        // Get content
        let content = sender[ senderProperty ];
        if ( content === undefined ) {
            if ( senderProperty === 'innerText' || senderProperty === 'text' ) {
                content = sender[ 'textContent' ];
            } else if ( senderProperty.indexOf( 'data-' ) === 0 ) { // "data-" attributes
                content = sender.getAttribute( senderProperty );
            }
        }
        if ( content === undefined ) {
            return;
        } else if ( sendType === 'json' ) {
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

        if ( sendType === 'fetch-html' ) {

            fetch( content, { headers: { 'Accept': 'text/html' }, signal: AbortSignal.timeout( 5000 ) } )
                .then( response => {
                    if ( ! response.ok ) {
                        throw new Error( 'Error fetching content from "' + content + '". Status: ' + response.status );
                    }
                    return response.text();
                } )
                .then( html => {
                    handleHistoryAndTargets( root, allowedPropMap, html, targets, { before: addToHistoryBeforeElements, after: addToHistoryAfterElements }, options );
                } )
                .catch( error => {
                    if ( errorFn ) {
                        errorFn( error, sender );
                    } else {
                        sender[ 'innerHTML' ] = error.message;
                    }
                } );
        } else {
            handleHistoryAndTargets( root, allowedPropMap, content, targets, { before: addToHistoryBeforeElements, after: addToHistoryAfterElements }, options );
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

    const onReceiveProp = target.getAttribute( 'on-receive' );
    if ( onReceiveProp ) {
        const r = parseFunction( onReceiveProp );
        if ( r ) {
            const { parameters, body } = r;
            const fn = new Function( ...parameters, body );
            content = fn( content );
        }
    }

    let receiveAsProp = target.getAttribute( 'receive-as' );
    if ( ! receiveAsProp ) {
        return; // Nothing to do
    }

    const onReceiveErrorProp = target.getAttribute( 'on-receive-error' );
    let errorFn: Function | undefined = undefined;
    if ( onReceiveErrorProp ) {
        const r = parseFunction( onReceiveErrorProp );
        if ( r ) {
            const { parameters, body } = r;
            errorFn = new Function( ...parameters, body );
        }
    }


    receiveAsProp = receiveAsProp.trim().toLowerCase();
    let targetProperty = allowedPropMap[ receiveAsProp ] || receiveAsProp; // Allow unmapped properties

    // fetch-html
    if ( targetProperty === 'fetch-html' && options?.fetch ) {

        // try {
        //     const response = await options.window.fetch( content, { signal: AbortSignal.timeout( 5000 ) } );
        //     if ( ! response.ok ) {
        //         throw new Error( 'Error fetching HTML from ' + content + '. HTTP status: ' + response.status );
        //     }
        //     targetProperty = 'innerHTML';

        // } catch ( err ) {
        //     content = err.message;
        // }

        // console.log( 'FETCH', content );
        options.fetch( content, { headers: { 'Accept': 'text/html' }, signal: AbortSignal.timeout( 5000 ) } )
            .then( response => {
                // console.log( 'RESPONSE', response );
                if ( ! response.ok ) {
                    throw new Error( 'Error fetching content from ' + content + '. HTTP status: ' + response.status );
                }
                return response.text();
            } )
            .then( html => {
                // console.log( 'HTML', html );
                if ( typeof options?.sanitizer === 'function' ) {
                    target[ 'innerHTML' ] = options.sanitizer( html );
                } else {
                    target[ 'innerHTML' ] = html;
                }
            } )
            .catch( error => {
                if ( errorFn ) {
                    errorFn( error, target );
                } else {
                    target[ 'innerHTML' ] = error.message;
                }
            } );


        return;
    }

    if ( targetProperty === 'innerHTML' && typeof options?.sanitizer === 'function' ) {
        target[ targetProperty ] = options.sanitizer( content );
        return;
    }

    target[ targetProperty ] = content.toString();
}


export function register( root: HTMLElement, options?: Options ) {

    const sendWhatElements = root.querySelectorAll( '[send-what]' );
    for ( const el of sendWhatElements ) {

        const sendWhat = el.getAttribute( 'send-what' );
        const sendEvent = el.getAttribute( 'send-on' );
        const sendTargets = el.getAttribute( 'send-to' );
        const sendAsType = el.getAttribute( 'send-as' );
        const prevent = el.getAttribute( 'prevent' ) !== null ? true : null;

        if ( ! sendEvent || ! sendTargets ) {
            continue;
        }

        const event = sendEvent.trim().toLowerCase();
        // TODO: allow abort signal to unregister all events
        if ( event === 'change' || event === 'blur' || event === 'focus' || event === 'click' ) {
            el.addEventListener( event, makeEventToReceiveProperty( root,
                { property: sendWhat, targets: sendTargets, sendType: sendAsType, prevent }, options ) );
        }
    }
}


export function unregister( root: HTMLElement ) {
}