import { SenderProperties } from "./types.js";

export function collectSenderProperties( el: Element ): SenderProperties | null {

    const checkedProperties = ( { sendProp, sendElement, sendOn, sendTo, sendAs, prevent } ) => {

        if ( sendProp && sendElement ) {
            throw new Error( 'Element "' + el.tagName + '" must not declare both "send-prop" and "send-element".' );
        }

        if ( sendOn === 'receive' && ( ! sendProp && ! sendElement ) ) {
            throw new Error( 'Element with the property "send-on" equals to "receive" must set either the property "send-prop" or "send-element".' );
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
        // console.log( sendElement, sendProp, sendOn, sendTo, sendAs );

        return checkedProperties( { sendProp: ( sendElement ? undefined : sendProp ), sendElement, sendOn, sendTo, sendAs, prevent } );
    }

    const sendProp = el.getAttribute( 'send-prop' ) || undefined;
    const sendElement = el.getAttribute( 'send-element' ) || undefined;
    let sendOn = el.getAttribute( 'send-on' ) || undefined;
    let sendTo = el.getAttribute( 'send-to' ) || undefined;
    const sendAs = el.getAttribute( 'send-as' ) || undefined;

    // Element is FORM and does not have onsubmit registered
    if ( ! sendOn && el.tagName === 'FORM' && ! el.getAttribute( 'onsubmit' ) ) {
        sendOn = 'submit';
        sendTo = el.getAttribute( 'action' ) || undefined;
        return { sendProp, sendElement, sendOn, sendTo, sendAs, prevent };
    }

    return checkedProperties( { sendProp, sendElement, sendOn, sendTo, sendAs, prevent } );
}
