import { parseUnquotedJSON } from "./parser.js";

export function extractHeaders( text ): Record< string, any > | undefined {
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


export function addHeaders( from: Record< string, any >, to: Record< string, any > ) {
    for ( const h in from ) {
        to[ h ] = from[ h ];
    }
}
