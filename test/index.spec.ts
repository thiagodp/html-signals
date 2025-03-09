import { register } from '../src';

import { JSDOM } from 'jsdom';

import { describe, it, expect, beforeAll, vi } from 'vitest';

describe( 'register', () => {

    let window;
    let document;

    const html = `
<html>
    <body>
    </body>
</html>
`;

    beforeAll( () => {
        const jsdom = new JSDOM( html );
        window = jsdom.window;
        document = window.document;
    } );


    it( 'can send the input value to another element\'s text when the input changes', () => {

        document.body.innerHTML = `
            <input
                send-what="value"
                send-on="change"
                send-to="div"
            />

            <div
              receive-as="text"
            ></div>
        `;

        register( document.body );

        const source = document.querySelector( 'input' );
        source.value = 'Hello';

        const event = new window.Event( 'change', {} );
        source.dispatchEvent( event );

        const target = document.querySelector( 'div' );
        expect( target.innerText ).toBe( 'Hello' );
    } );


    it( 'can send an input value to more than one element using the query selector', () => {

        document.body.innerHTML = `
            <input
                send-what="value"
                send-on="change"
                send-to="div"
            />

            <div
              receive-as="text"
            ></div>

            <div id="two"
              receive-as="text"
            ></div>
        `;

        register( document.body );

        const source = document.querySelector( 'input' );
        source.value = 'Hello';

        const event = new window.Event( 'change', {} );
        source.dispatchEvent( event );

        const target = document.querySelector( 'div' );
        expect( target.innerText ).toBe( 'Hello' );

        const targetTwo = document.querySelector( '#two' );
        expect( targetTwo.innerText ).toBe( 'Hello' );
    } );



    it( 'can send an input value to different elements using the query selector', () => {

        document.body.innerHTML = `
            <input
                send-what="value"
                send-on="change"
                send-to="div,span"
            />

            <div
              receive-as="text"
            ></div>

            <span
              receive-as="text"
            ></span>
        `;

        register( document.body );

        const source = document.querySelector( 'input' );
        source.value = 'Hello';

        const event = new window.Event( 'change', {} );
        source.dispatchEvent( event );

        const target = document.querySelector( 'div' );
        expect( target.innerText ).toBe( 'Hello' );

        const targetTwo = document.querySelector( 'span' );
        expect( targetTwo.innerText ).toBe( 'Hello' );
    } );




    it( 'can send the source element text to the target element\'s text when the source is clicked', () => {

        const content = 'Hello';

        document.body.innerHTML = `
            <div
                send-what="text"
                send-on="click"
                send-to="#foo"
            >${content}</div>

            <div id="foo"
                receive-as="text"
            ></div>
        `;

        register( document.body );

        const source = document.querySelector( 'div' );
        const event = new window.Event( 'click', {} );
        source.dispatchEvent( event );

        const target = document.querySelector( '#foo' );
        expect( target.innerText ).toBe( content );
    } );


    it( 'can send the source element HTML to the target element\'s HTML when the source is clicked', () => {

        const content = '<b>Hello</b>';

        document.body.innerHTML = `
            <div
                send-what="html"
                send-on="click"
                send-to="#foo"
            >${content}</div>

            <div id="foo"
                receive-as="html"
            ></div>
        `;

        register( document.body );

        const source = document.querySelector( 'div' );
        const event = new window.Event( 'click', {} );
        source.dispatchEvent( event );

        const target = document.querySelector( '#foo' );
        expect( target.innerHTML ).toBe( content );
    } );


    it( 'can send a data property from the source element when it is clicked', () => {

        const value = '10';

        document.body.innerHTML = `
            <div
                send-what="data-id"
                send-on="click"
                send-to="#foo"
                data-id="${value}"
            ></div>

            <div id="foo"
                receive-as="text"
            ></div>
        `;

        register( document.body );

        const source = document.querySelector( 'div' );
        const event = new window.Event( 'click', {} );
        source.dispatchEvent( event );

        const target = document.querySelector( '#foo' );
        expect( target.innerText ).toBe( value );
    } );



    it( 'can allow a target to transforming data when receiving it', () => {

        const value = '10';

        document.body.innerHTML = `
            <div
                send-what="data-id"
                send-on="click"
                send-to="#foo"
                data-id="${value}"
            ></div>

            <div id="foo"
                on-receive="( data ) => 'Number: ' + data"
                receive-as="text"
            ></div>
        `;

        register( document.body );

        const source = document.querySelector( 'div' );
        const event = new window.Event( 'click', {} );
        source.dispatchEvent( event );

        const target = document.querySelector( '#foo' );
        expect( target.innerText ).toBe( 'Number: ' + value );
    } );



    it( 'can allow a target to transforming JSON data when receiving it', () => {

        document.body.innerHTML = `
            <div
                send-what="data-id"
                send-on="click"
                send-to="#foo"
                data-id="{ value: 10 }"
                send-as="json"
            ></div>

            <div id="foo"
                on-receive="( obj ) => obj.value"
                receive-as="text"
            ></div>
        `;

        register( document.body );

        const source = document.querySelector( 'div' );
        const event = new window.Event( 'click', {} );
        source.dispatchEvent( event );

        expect( source.getAttribute( 'data-id' ) ).toBe( '{ value: 10 }' );

        const target = document.querySelector( '#foo' );
        expect( target.innerText ).toBe( '10' );
    } );


    it( 'can send a value to the browser history', () => {

        // data-url is empty to avoid security errors during the test
        document.body.innerHTML = `
            <div
                data-url=""
                send-what="data-url"
                send-on="click"
                send-to="$history"
            >Foo</div>
        `;

        register( document.body, { window } );

        expect( window.history.length ).toBe( 1 );

        const spy = vi.spyOn( window.history, 'pushState' );

        const source = document.querySelector( 'div' );
        const event = new window.Event( 'click', {} );
        source.dispatchEvent( event );

        expect( spy ).toHaveBeenCalled();

        vi.restoreAllMocks()
    } );


    it( 'can prevent the default behavior in a click', () => {

        // console.log( window.location.href );

        // data-url is empty to avoid security errors during the test
        document.body.innerHTML = `
            <a
                href="/foo"
                prevent
                send-what="href"
                send-on="click"
                send-to="div"
            >Foo</a>

            <div receive-as="text" ></div>
        `;

        register( document.body );

        const source = document.querySelector( 'a' );
        const event = new window.Event( 'click', {} );
        source.dispatchEvent( event );

        expect( window.location.href ).not.toBe( '/foo' );

        const target = document.querySelector( 'div' );
        expect( target.innerText ).toBe( '/foo' );
    } );

} );