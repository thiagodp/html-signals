export function parseFunction( functionString ) {
    const functionRegex = /^[ ]*(function ?[a-z_0-9]*)?[ ]*([a-z_0-9, ]+|\([ ]*[a-z_0-9, ]*[ ]*\){0,1}[ ]*)[ ]*(=>[ ]*([^{].*)|=>[ ]+\{(.+)\}|\{(.*)\})/i;
    const r = functionRegex.exec( functionString );
    // console.log( r );
    if ( ! r ) {
        return { parameters: [], body: '' };
    }
    let [ , , header, body ] = r;
    // console.log( header );
    // console.log( body );
    const parameters = header.replaceAll( /\(|\)/g, '' ).split( ',' ).map( v => v.trim() ).filter( v => v.length > 0 );
    if ( body.startsWith( '=>' ) ) {
        body = body.replace( '=>', '' );
        if ( ! body.trim().startsWith( '{' ) ) {
            body = 'return' + body;
        }
    }
    // console.log( 'parameters', parameters );
    return { parameters, body };
}


export function parseUnquotedJSON( jsonString: string ): string {

    // Replace unquoted keys with quoted keys
    const newJsonString = jsonString.replace( /([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '"$1":' );

    // Parse the string
    return new Function(`return ${newJsonString}`)();
}
