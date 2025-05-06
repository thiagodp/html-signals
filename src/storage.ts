import { parseBoolean } from "./parser.js";

export type StorageOptions = {
    type: 'array'|'set'|'object'|'string'|'number'|'boolean',
    key?: string,
    session?: boolean,
}


const defaultStorageOptions: StorageOptions = { type: 'string', key: 'key' };


export const isStorage = text => /^\$storage$/i.test( text );


export interface StorageLike {
    getItem( key: string ): string | null;
    setItem( key: string, value: string );
}


export function setStorageItem( storage: StorageLike|Storage, content: any, options?: StorageOptions ) {

    const opt = { ...defaultStorageOptions, ...options };
    const key: string = ( opt.key || defaultStorageOptions.key ) as string;
    const desiredType: string = ( opt.type || defaultStorageOptions.type ).toLowerCase();
    let item;

    if ( desiredType === 'array' || desiredType === 'set' ) {

        if ( ! Array.isArray( content ) ) {
            let existingItems: Array< any > = getStorageItem( storage, opt ) as Array< any >;
            // Add the given content
            if ( desiredType === 'set' ) {
                const aSet = new Set( existingItems );
                aSet.add( content );
                existingItems = Array.from( aSet );
            } else {
                existingItems.push( content );
            }
            item = JSON.stringify( existingItems );
        } else {
            item = JSON.stringify( content );
        }

    } else if ( desiredType === 'object' ) {
        item = JSON.stringify( content );
    } else if ( typeof content != 'string' ) {
        item = content.toString();
    } else {
        item = content;
    }

    storage.setItem( key, item );
}



export function getStorageItem( storage: StorageLike|Storage, options?: StorageOptions ): unknown {

    const opt = { ...defaultStorageOptions, ...options };
    const key: string = ( opt.key || defaultStorageOptions.key ) as string;
    const desiredType: string = ( opt.type || defaultStorageOptions.type ).toLowerCase();

    let item: string|null = storage.getItem( key );

    if ( desiredType === 'array' || desiredType === 'set' ) {
        return item === null ? [] : JSON.parse( item );
    } else if ( desiredType === 'object' ) {
        return item === null ? null : JSON.parse( item );
    } else if ( desiredType === 'boolean' ) {
        return parseBoolean( item || '' );
    } else if ( desiredType === 'number' ) {
        return Number( item === undefined ? 0 : item );
    }

    return item || ''; // string
}
