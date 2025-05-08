import { SenderProperties } from "./types.js";

export function collectSenderProperties( el: Element ): SenderProperties | null {

    const checkedProperties = ( { sendProp, sendElement, sendReturn, sendOn, sendTo, sendAs, sendOnce, prevent } ) => {

        const definedSendProperties = [ sendProp, sendElement, sendReturn ].filter( v => v !== undefined ).length;

        const hasConflictingSendProperties = definedSendProperties > 1;

        if ( hasConflictingSendProperties ) {
            throw new Error( 'Element "' + el.tagName + '" must have just one of these properties defined: "send-prop", "send-element", "send-return".' );
        }

        if ( sendOn === 'receive' && definedSendProperties === 0 ) {
            throw new Error( 'Element with the property "send-on" equals to "receive" must set either "send-prop", "send-element", or "send-return".' );
        }

        if ( ! sendOn || ! sendTo || definedSendProperties === 0 ) {
            return null;
        }

        return { sendProp, sendElement, sendReturn, sendOn, sendTo, sendAs, sendOnce, prevent };
    }

    const extractElement = text => {
        const result = /^\{([^}])\}$/.exec( text ); // Example: {#foo}
        return result ? result.at( 1 ) : undefined;
    };

    const extractCode = text => {
        const result = /^\$\{([^}])\}$/.exec( text ); // Example: ${1+1}
        return result ? result.at( 1 ) : undefined;
    };


    const prevent = el.getAttribute( 'prevent' ) !== null ? true : undefined;

    const send = el.getAttribute( 'send' ) || undefined;
    if ( send ) {
        const [ sendWhat, sendOn, sendTo, sendAs, once ] = send.split( '|' ).map( value => value.trim() || undefined );
        const sendOnce = once === 'true' || once === '1' ? true : false; // It should be explicit

        const sendReturn = sendWhat?.startsWith( '$' ) ? extractCode( sendWhat ) : undefined;

        const sendElement = sendReturn === undefined && sendWhat?.startsWith( '{' )
            ? extractElement( sendWhat ) : undefined;

        const sendProp = sendReturn || sendElement ? undefined : sendWhat;
        // console.log( sendReturn, sendElement, sendProp, sendOn, sendTo, sendAs, sendOnce );

        return checkedProperties(
            { sendReturn, sendProp, sendElement, sendOn, sendTo, sendAs, sendOnce, prevent } );
    }

    const sendProp = el.getAttribute( 'send-prop' ) || undefined;
    const sendElement = el.getAttribute( 'send-element' ) || undefined;
    const sendReturn = el.getAttribute( 'send-return' ) || undefined;
    let sendOn = el.getAttribute( 'send-on' ) || undefined;
    let sendTo = el.getAttribute( 'send-to' ) || undefined;
    const sendAs = el.getAttribute( 'send-as' ) || undefined;
    const sendOnce = [ '', 'true', '1' ].includes( el.getAttribute( 'send-once' )! ); // Implicit when ''

    // Element is FORM and does not have onsubmit registered
    if ( ! sendOn && el.tagName === 'FORM' && ! el.getAttribute( 'onsubmit' ) ) {
        sendOn = 'submit';
        sendTo = el.getAttribute( 'action' ) || undefined;
        return { sendProp, sendElement, sendReturn, sendOn, sendTo, sendAs, sendOnce, prevent };
    }

    return checkedProperties( { sendProp, sendElement, sendReturn, sendOn, sendTo, sendAs, sendOnce, prevent } );
}
