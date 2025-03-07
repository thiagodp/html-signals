import { describe, expect, it } from "vitest";
import { parseFunction, parseUnquotedJSON } from "../src/parser";

describe( '#parseFunction', () => {

    describe( 'arrow function', () => {

        it( 'can parse with one parameter', () => {
            const fn = '( foo ) => "foo"';
            const r = parseFunction( fn );
            expect( r?.parameters ).toContain( 'foo' );
            expect( r?.body ).toContain( 'return "foo"' );
        } );


        it( 'can parse with one parameter without parenthesis', () => {
            const fn = 'foo => "foo"';
            const r = parseFunction( fn );
            expect( r?.parameters ).toContain( 'foo' );
            expect( r?.body ).toContain( 'return "foo"' );
        } );


        it( 'can parse with two parameters', () => {
            const fn = '( foo, bar ) => "foo"';
            const r = parseFunction( fn );
            expect( r?.parameters ).toContain( 'foo' );
            expect( r?.parameters ).toContain( 'bar' );
            expect( r?.body ).toContain( 'return "foo"' );
        } );


        it( 'can parse with a body', () => {
            const fn = '( foo, bar ) => { return "foo" }';
            const r = parseFunction( fn );
            expect( r?.parameters ).toContain( 'foo' );
            expect( r?.parameters ).toContain( 'bar' );
            expect( r?.body ).toContain( '{ return "foo" }' );
        } );

    } );

    describe( 'non arrow function', () => {

        it( 'can parse anonymous function with parameters and body', () => {
            const fn = 'function( foo, bar ) { return "foo" }';
            const r = parseFunction( fn );
            expect( r?.parameters ).toContain( 'foo' );
            expect( r?.parameters ).toContain( 'bar' );
            expect( r?.body ).toContain( '{ return "foo" }' );
        } );


        it( 'can parse a named function with parameters and body', () => {
            const fn = 'function zoo( foo, bar ) { return "foo" }';
            const r = parseFunction( fn );
            expect( r?.parameters ).toContain( 'foo' );
            expect( r?.parameters ).toContain( 'bar' );
            expect( r?.body ).toContain( '{ return "foo" }' );
        } );

    } );

} );


describe( '#parseUnquotedJSON', () => {

    it( 'can parse an object with primitive types', () => {
        const value = '{ name: "Bob", age: 20, married: true, address: null, company: undefined }';
        const r = parseUnquotedJSON( value );
        expect( r ).toEqual( { name: "Bob", age: 20, married: true, address: null, company: undefined } );
    } );

    it( 'can parse an object with a nested object', () => {
        const value = '{ name: "Bob", company: { name: "Acme" } }';
        const r = parseUnquotedJSON( value );
        expect( r ).toEqual( { name: "Bob", company: { name: "Acme" } } );
    } );

    it( 'can parse an object with an array of strings', () => {
        const value = '{ name: "Bob", children: [ "Suzan", "Alice" ] }';
        const r = parseUnquotedJSON( value );
        expect( r ).toEqual( { name: "Bob", children: [ "Suzan", "Alice" ] } );
    } );

} );