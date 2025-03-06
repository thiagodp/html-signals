export type Options = {
    document?: Document
};


function makeEventToReceiveProperty( root, property, sendToTargets ) {

    return event => {

        const targetElements = sendToTargets ? root.querySelectorAll( sendToTargets ) : undefined;
        if ( ! targetElements ) {
            return; // No element to send to
        }

        const prop = property ? property.trim().toLowerCase() : '';

        const allowedPropMap = { 'value': 'value', 'text': 'innerText', 'html': 'innerHTML' };
        const senderProperty = allowedPropMap[ prop ] || prop; // Allow unmapped properties

        const sender = event.target;
        for ( const el of targetElements ) {
            let content = sender[ senderProperty ];
            if ( content === undefined ) {
                if ( senderProperty === 'text' ) {
                    content = sender[ 'textContent' ];
                } else if ( senderProperty.indexOf( 'data-' ) === 0 ) { // "data-" attributes
                    content = sender.getAttribute( senderProperty );
                }
            }
            if ( content === undefined ) {
                continue; // Ignore if not defined
            }
            receive( el, content, allowedPropMap );
        }
    };
}


function receive( target, content, allowedPropMap ) {

    let receiveAsProp = target.getAttribute( 'receive-as' );
    if ( ! receiveAsProp ) {
        return; // Nothing to do
    }

    receiveAsProp = receiveAsProp.trim().toLowerCase();
    const targetProperty = allowedPropMap[ receiveAsProp ] || receiveAsProp; // Allow unmapped properties

    target[ targetProperty ] = content;
}


export function register( root: HTMLElement, options?: Options ) {

    const sendWhatElements = root.querySelectorAll( '[send-what]' );
    for ( const el of sendWhatElements ) {

        const sendWhat = el.getAttribute( 'send-what' );
        const sendEvent = el.getAttribute( 'send-on' );
        const sendTargets = el.getAttribute( 'send-to' );

        if ( ! sendEvent || ! sendTargets ) {
            continue;
        }

        const event = sendEvent.trim().toLowerCase();
        // TODO: allow abort signal to unregister all events
        if ( event === 'change' || event === 'blur' || event === 'focus' || event === 'click' ) {
            el.addEventListener( event, makeEventToReceiveProperty( root, sendWhat, sendTargets ) );
        }
    }
}


export function unregister( root: HTMLElement ) {
}