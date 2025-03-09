import { parseFunction, parseUnquotedJSON } from "./parser";


type SanitizerFunction = ( content: string ) => string;


export type Options = {
    window?: Window,
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

        // Evaluate the sender property
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

        // History
        if ( addToHistoryBeforeElements && options?.window ) {
            options.window.history.pushState( null, '', content );
        }

        // Select target elements and send the content
        const targetElements = targets ? root.querySelectorAll( targets ) : [];
        for ( const el of targetElements ) {
            receive( el, content, allowedPropMap, options?.sanitizer );
        }

        // History
        if ( addToHistoryAfterElements && options?.window ) {
            options.window.history.pushState( null, '', content );
        }
    };
}




function receive( target, content, allowedPropMap, sanitizer ) {

    let onReceiveProp = target.getAttribute( 'on-receive' );
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

    receiveAsProp = receiveAsProp.trim().toLowerCase();
    const targetProperty = allowedPropMap[ receiveAsProp ] || receiveAsProp; // Allow unmapped properties

    if ( targetProperty === 'innerHTML' && typeof sanitizer === 'function' ) {
        target[ targetProperty ] = sanitizer( content );
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