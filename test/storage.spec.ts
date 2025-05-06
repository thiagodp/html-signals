import { describe, it, expect } from 'vitest';
import { getStorageItem, setStorageItem, StorageLike, StorageOptions } from '../src/storage.js';

class FakeStorage implements StorageLike {

    map = new Map<string, string>();

    getItem(key: string): string|null {
        const v = this.map.get( key );
        return v === undefined ? null : v;
    }

    setItem(key: string, value: string) {
        this.map.set( key, value );
    }

    with( key: string, value: string ) {
        this.setItem( key, value );
        return this;
    }

    size() {
        return this.map.size;
    }
}

describe( 'storage', () => {

    it( 'generates a key when not defined', () => {
        const fakeStorage = new FakeStorage();
        const options: StorageOptions = { type: 'number' }; // No key

        setStorageItem( fakeStorage, 5, options );
        expect( fakeStorage.size() ).toBe( 1 );

        const value = getStorageItem( fakeStorage, options );
        expect( value ).toBe( 5 );
    } );


    describe( 'array', () => {

        it( 'extract an unexisting array as an empty array', () => {
            const fakeStorage = new FakeStorage();
            const options: StorageOptions = { type: 'array', key: 'items' };
            const value = getStorageItem( fakeStorage, options );
            expect( value ).toEqual( [] );
        } );

        it( 'can add an object', () => {
            const fakeStorage = new FakeStorage();
            const options: StorageOptions = { type: 'array', key: 'items' };
            const value = { title: 'Foo', completed: false };
            setStorageItem( fakeStorage, value, options );
            const expected = JSON.stringify( [ value ] );
            expect( fakeStorage.getItem( options.key! ) ).toEqual( expected );
        } );

        it( 'can add a number', () => {
            const fakeStorage = new FakeStorage();
            const options: StorageOptions = { type: 'array', key: 'items' };
            const value = 5;
            setStorageItem( fakeStorage, value, options );
            const expected = JSON.stringify( [ value ] );
            expect( fakeStorage.getItem( options.key! ) ).toEqual( expected );
        } );

        it( 'does not avoid duplicated items', () => {
            const fakeStorage = new FakeStorage();
            const options: StorageOptions = { type: 'array', key: 'items' };
            const value = 5;
            setStorageItem( fakeStorage, value, options );
            setStorageItem( fakeStorage, value, options );
            const expected = JSON.stringify( [ value, value ] );
            expect( fakeStorage.getItem( options.key! ) ).toEqual( expected );
        } );

    } );


    describe( 'set', () => {

        it( 'avoid duplicated items', () => {
            const fakeStorage = new FakeStorage();
            const options: StorageOptions = { type: 'set', key: 'items' };
            const value = 5;
            setStorageItem( fakeStorage, value, options );
            setStorageItem( fakeStorage, value, options );
            const expected = JSON.stringify( [ value ] );
            expect( fakeStorage.getItem( options.key! ) ).toEqual( expected );
        } );

    } );


    describe( 'object', () => {

        it( 'can be stored and retrieved', () => {
            const fakeStorage = new FakeStorage();
            const options: StorageOptions = { type: 'object', key: 'foo' };
            const value = { title: 'Foo', completed: false };
            setStorageItem( fakeStorage, value, options );
            const expected = JSON.stringify( value );
            expect( fakeStorage.getItem( options.key! ) ).toEqual( expected );
        } );

    } );

} );