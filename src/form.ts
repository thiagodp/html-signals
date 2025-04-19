import { makeFunction } from './function.js';
import { parseUnquotedJSON } from './parser.js';
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


        // Convert form data to object if it's json
        const formData = new FormData( form );
        const obj = {};
        const isJson = props.sendAs === 'json';
        const isMultipart = props.sendAs === 'multipart';
        if ( isJson ) {
            for ( const [ key, value ] of formData.entries() ) {
                obj[ key ] = value.valueOf();
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
            // TODO: make an option to keep the id field from the JSON on PUT and PATCH
            if ( isJson ) {
                id = obj[ idField ];
                delete obj[ idField ] ;
            } else {
                id = formData.get( idField );
                formData.delete( idField );
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


function extractHeaders( text ): Record< string, any > | undefined {
    if ( ! text ) {
        return;
    }
    // > Pipe-separated format
    // const headers = text.split( '|' );
    // const obj = {};
    // for ( const h of headers ) {
    //     const [ key, value ] = h.split( ':' ).map( v => v.trim() );
    //     obj[ key ] = value
    // }
    // return obj;
    try {
        return parseUnquotedJSON( text ) as Record< string, any >;
    } catch ( error ) {
        console.error( error.message );
        return undefined;
    }
}


function addHeaders( from: Record< string, any >, to: Record< string, any > ) {
    for ( const h in from ) {
        to[ h ] = from[ h ];
    }
}
