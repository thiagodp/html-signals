export function parseFunction( functionString ) {
    const functionRegex = /^(?:function[ ]*[a-z0-9_$]*)?[ ]*((?:\()?(([a-z0-9_${}]*)[, ]*)+(?:\))?)[ ]*(=>.*|{.*)/i;
    const r = functionRegex.exec( functionString );
    // console.log( r );
    if ( ! r ) {
        return { parameters: [], body: '' };
    }
    let [ , header, , , body ] = r;
    // console.log( 'header', header );
    // console.log( 'body', body );
    const parametersRegex = /(?:\{?[ ]*[a-z][a-z0-9$_, ]*\}?|[a-z][a-z0-9_$]*)/mig;
    const rp: string[] = Array.from( header.matchAll( parametersRegex ) ).map( arr => arr[ 0 ].trim() );
    // console.log( 'RP', rp );
    let parameters: string[] = [];
    for ( const p of rp ) {
        if ( p.startsWith( '{' ) ) {
            parameters.push( p );
        } else {
            parameters.push( ...p.split( ',' ).map( v => v.trim() ).filter( v => v.length > 0 ) );
        }
    }
    // console.log( 'PARAMETERS', parameters );
    if ( body.startsWith( '=>' ) ) {
        body = body.replace( '=>', '' );
        if ( ! body.trim().startsWith( '{' ) ) {
            body = 'return' + body;
        }
    }
    return { parameters, body };
}


/**
 * Parse a JSON string with unquoted or single-quoted properties.
 *
 * @param jsonString Input string with JSON content
 * @returns string with JSON
 */
export function parseUnquotedJSON( jsonString: string ): string {

    // Replace unquoted keys with quoted keys
    const newJsonString = jsonString.replace( /([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '"$1":' );

    // Parse the string
    return new Function(`return ${newJsonString}`)();
}
