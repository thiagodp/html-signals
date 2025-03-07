import { describe, expect, it } from "vitest";
import { parseFunction } from "../src/parser";

describe( '#parseFunction', () => {

    describe( 'arrow function', () => {

        it( 'can parse with one parameter', () => {
            const fn = '( foo ) => "foo"';
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