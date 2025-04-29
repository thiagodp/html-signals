import { makeFunction } from './function.js';
import { addHeaders, extractHeaders } from './headers.js';
import { parseBoolean } from './parser.js';
import { Options, SenderProperties } from './types.js';


export function registerSubmitEvent( el: Element, signal, props: SenderProperties, options: Options, timeout: number ) {

    const sendFormData = async ( event ) => {

        event.preventDefault();

        const form = event.target;

        // Validate
        const isOK = form.reportValidity();
        if ( ! isOK ) {
            return false;
        }

        if ( ! options.fetch ) {
            console.error( 'fetch is not available' );
            return false;
        }

        // OnSendError
        const onSendError = form.getAttribute( 'on-send-error' ) || undefined;
        const onSendErrorFn: Function | undefined = makeFunction( onSendError );

        // Adjust the form data on extraction - for strings only
        // form.addEventListener( 'formdata', adjustFormData, { signal } );

        // Convert form data to object if it's json
        const formData = new FormData( form );
        const obj = {};
        const isJson = props.sendAs === 'json';
        const isMultipart = props.sendAs === 'multipart';

        if ( isJson ) {
            for ( const [ key, value ] of formData.entries() ) {
                obj[ key ] = value.valueOf();

                // Evaluate "send-as"
                const element = form.querySelector( `[name="${key}"]` );
                const sendAs = element?.getAttribute( 'send-as' );
                if ( ! sendAs ) {
                    continue;
                }

                // Convert if needed
                if ( sendAs === 'number' || sendAs === 'float' || sendAs == 'int' ) {
                    const newValue = Number( obj[ key ] );
                    if ( ! isNaN( newValue ) ) {
                        obj[ key ] = newValue;
                    }
                } else if ( sendAs === 'boolean' ) {
                    // Evaluate the element
                    if ( element.tagName === 'INPUT' && element.getAttribute( 'type' ) === 'checkbox' ) {
                        obj[ key ] = element.checked;
                    } else {
                        obj[ key ] = parseBoolean( obj[ key ] );
                    }
                }
                // TODO: expand the supported types
            }
        }

        // Check URL
        let url = form.action || '';
        if ( ! url ) {
            throw new Error( 'Form must have the property "action" set.' );
        }

        // Check HTTP method
        const method = form.getAttribute( 'method' )?.toUpperCase() || 'POST';
        if ( method === 'GET' ) {
            throw new Error( 'The form property "method" should not be "GET" when the property "send-as" is defined.' );
        }
        const supportedMethods = [ 'POST', 'PUT', 'PATCH', 'DELETE' ];
        if ( ! supportedMethods.includes( method ) ) {
            throw new Error( 'Supported HTTP methods are: ' + supportedMethods.join( ', ' ) );
        }
        const shouldContainIdInTheURL = [ 'PUT', 'PATCH', 'DELETE' ].includes( method );

        // Add the id to the URL
        // TODO: make an option to set the desired id field name
        const idField = 'id';
        let id;
        if ( shouldContainIdInTheURL ) {

            const idElement = form.querySelector( `[name="${idField}"]` );
            const isSendAsDefined = idElement && idElement.getAttribute( 'send-as' ) !== null;

            if ( isJson ) {
                id = obj[ idField ];
                if ( ! isSendAsDefined ) {
                    delete obj[ idField ] ;
                }
            } else {
                id = formData.get( idField );
                if ( ! isSendAsDefined ) {
                    formData.delete( idField );
                }
            }
            url += url.endsWith( '/' ) ? id : '/' + id;
        }

        // Headers

        const httpHeaders = {};
        if ( method != 'DELETE' ) {
            httpHeaders[ 'Content-Type' ] = isJson ? 'application/json' : ( isMultipart ? 'multipart/form-data' : 'application/x-www-form-urlencoded' );
        }

        const userHeaders = extractHeaders( form.getAttribute( 'headers' ) ) || {};

        addHeaders( userHeaders, httpHeaders );

        // Fetch
        // TODO: define option to retrieve content when the response is received

        const fetchOptions: RequestInit = {
            method,
            signal: AbortSignal['any']( [ signal!, AbortSignal.timeout( timeout ) ] ),
            credentials: 'include',
            headers: httpHeaders,
        };

        if ( method != 'DELETE' ) {

            // If FormData is passed directly, fetch will send the data as "multipart/form-data",
            // so it's being converted to URLSearchParams when send is not 'multipart'.

            fetchOptions[ 'body' ] = isJson
                ? JSON.stringify( obj )
                : ( isMultipart ? formData : ( new URLSearchParams( formData as unknown as Record<string, string> ) ).toString() );

        }

        // console.log( fetchOptions );

        let outerResponse;
        return options!.fetch( url, fetchOptions )
            .then( response => {
                outerResponse = response;
                if ( ! response.ok ) {
                    throw new Error( `Error sending HTTP ${method} to "${url}". Status: ${response.status}` );
                }
                return response;
                // return isJSON ? response.json() : response.text();
            } )
            .catch( error => {
                if ( onSendErrorFn ) {
                    onSendErrorFn( error, form, outerResponse );
                    return;
                }
                console.error( error.message );
            } );
    };

    el.addEventListener( props.sendOn!, sendFormData );
}


// function adjustFormData( event: FormDataEvent ) {
//     const form = event.target as HTMLFormElement;
//     const formData = event.formData;
//     const elements = form.elements;
//     for ( const e of elements ) {
//         const sendAs = e.getAttribute( 'send-as' );
//         if ( ! sendAs ) {
//             continue;
//         }
//         formData.set( e.getAttribute( 'name' )!, '' ) // Only strings, no it does not make sense to use it
//     }


// }