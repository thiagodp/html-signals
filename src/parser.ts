export function parseFunction( functionString ) {
    const functionRegex = /^[ ]*(function ?[a-z_0-9]*)?[ ]*([a-z_0-9, ]+|\([ ]*[a-z_0-9, ]+[ ]*\)+[ ]*)[ ]*(=>[ ]*([^{].*)|=>[ ]+\{(.+)\}|\{(.*)\})/i;
    const r = functionRegex.exec( functionString );
    if ( ! r ) {
        return;
    }
    // console.log( r );
    let [ , , header, body ] = r;
    // console.log( header );
    // console.log( body );
    const parameters = header.replaceAll( /\(|\)/g, '' ).split( ',' ).map( v => v.trim() );
    if ( body.startsWith( '=>' ) ) {
        body = body.replace( '=>', '' );
        if ( ! body.trim().startsWith( '{' ) ) {
            body = 'return' + body;
        }
    }
    return { parameters, body };
}
