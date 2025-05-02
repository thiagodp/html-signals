import fetchMock from '@fetch-mock/vitest';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { register } from '../src';
import { EVENT_DOM_LOADED, EVENT_FETCH_SUCCESS } from '../src/events';

import { DOMWindow } from 'jsdom';
import { Win } from '../src/types';

// import createFetchMock from 'vitest-fetch-mock';
// const fetch = createFetchMock(vi);

// import fetchMock from 'fetch-mock';

// manageFetchMockGlobally(); // optional

const sleep = timeMS => new Promise( ( resolve ) => {
    setTimeout( resolve, timeMS );
} );

const waitForEvent = ( element: Element, eventName ) => new Promise( ( resolve ) => {
    element.addEventListener( eventName, resolve, { once: true } );
} );


describe( 'register', () => {

    let window: DOMWindow;
    let document: Document;

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

        // fetch.enableMocks();
        fetchMock.config.allowRelativeUrls = true;
    } );

    afterAll( () => {
        // fetch.disableMocks();
    } );

    beforeEach( () => {
        // fetch.resetMocks();
        fetchMock.removeRoutes();
    } );


    it( 'throws when root element, window and document are not defined', () => {

        expect( () => {
            register( undefined, { window: undefined, document: undefined } );
        } ).toThrowError();
    } );


    it( 'can send the input value to another element\'s text when the input changes', () => {

        document.body.innerHTML = `
            <input
                send-prop="value"
                send-on="change"
                send-to="div"
            />

            <div
              receive-as="text"
            ></div>
        `;

        register( document.body, { window: window as unknown as Win } );

        const source = document.querySelector( 'input' );
        source!.value = 'Hello';

        const event = new window.Event( 'change', {} );
        source!.dispatchEvent( event );

        const target = document.querySelector( 'div' );
        expect( ( target as HTMLElement ).innerText ).toBe( 'Hello' );
    } );


    it( 'can send an input value to more than one element using the query selector', () => {

        document.body.innerHTML = `
            <input
                send-prop="value"
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

        register( document.body, { window: window as unknown as Win } );

        const source = document.querySelector( 'input' );
        source!.value = 'Hello';

        const event = new window.Event( 'change', {} );
        source!.dispatchEvent( event );

        const target = document.querySelector( 'div' );
        expect( ( target as HTMLElement ).innerText ).toBe( 'Hello' );

        const targetTwo = document.querySelector( '#two' );
        expect( ( targetTwo as HTMLElement ).innerText ).toBe( 'Hello' );
    } );



    it( 'can send an input value to different elements using the query selector', () => {

        document.body.innerHTML = `
            <input
                send-prop="value"
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

        register( document.body, { window: window as unknown as Win } );

        const source = document.querySelector( 'input' );
        source!.value = 'Hello';

        const event = new window.Event( 'change', {} );
        source!.dispatchEvent( event );

        const target = document.querySelector( 'div' );
        expect( ( target as HTMLElement ).innerText ).toBe( 'Hello' );

        const targetTwo = document.querySelector( 'span' );
        expect( ( targetTwo as HTMLElement ).innerText ).toBe( 'Hello' );
    } );


    it( 'can send the source element text to the target element\'s text when the source is clicked', () => {

        const content = 'Hello';

        document.body.innerHTML = `
            <div
                send-prop="text"
                send-on="click"
                send-to="#foo"
            >${content}</div>

            <div id="foo"
                receive-as="text"
            ></div>
        `;

        register( document.body, { window: window as unknown as Win } );

        const source = document.querySelector( 'div' );
        const event = new window.Event( 'click', {} );
        source!.dispatchEvent( event );

        const target = document.querySelector( '#foo' );
        expect( ( target as HTMLElement ).innerText ).toBe( content );
    } );


    it( 'can send the source element HTML to the target element\'s HTML when the source is clicked', () => {

        const content = '<b>Hello</b>';

        document.body.innerHTML = `
            <div
                send-prop="html"
                send-on="click"
                send-to="#foo"
            >${content}</div>

            <div id="foo"
                receive-as="html"
            ></div>
        `;

        register( document.body, { window: window as unknown as Win } );

        const source = document.querySelector( 'div' );
        const event = new window.Event( 'click', {} );
        source!.dispatchEvent( event );

        const target = document.querySelector( '#foo' );
        expect( target!.innerHTML ).toBe( content );
    } );


    it( 'can send a data property from the source element when it is clicked', () => {

        const value = '10';

        document.body.innerHTML = `
            <div
                send-prop="data-id"
                send-on="click"
                send-to="#foo"
                data-id="${value}"
            ></div>

            <div id="foo"
                receive-as="text"
            ></div>
        `;

        register( document.body, { window: window as unknown as Win } );

        const source = document.querySelector( 'div' );
        const event = new window.Event( 'click', {} );
        source!.dispatchEvent( event );

        const target = document.querySelector( '#foo' );
        expect( ( target as HTMLElement ).innerText ).toBe( value );
    } );



    it( 'allows a target to transforming data when receiving it', () => {

        const value = '10';

        document.body.innerHTML = `
            <div
                send-prop="data-id"
                send-on="click"
                send-to="#foo"
                data-id="${value}"
            ></div>

            <div id="foo"
                on-receive="( data ) => 'Number: ' + data"
                receive-as="text"
            ></div>
        `;

        register( document.body, { window: window as unknown as Win } );

        const source = document.querySelector( 'div' );
        const event = new window.Event( 'click', {} );
        source!.dispatchEvent( event );

        const target = document.querySelector( '#foo' );
        expect( ( target as HTMLElement ).innerText ).toBe( 'Number: ' + value );
    } );


    it( 'can make a checkbox input to receive a boolean value as checked', () => {

        document.body.innerHTML = `
            <button
                data-value="1"
                send="data-value|click|input|boolean"
            >Click Me</button>

            <input type="checkbox" receive-as="checked" />
        `;

        register( document.body, { window: window as unknown as Win } );

        const source = document.querySelector( 'button' );
        source!.dispatchEvent( new window.Event( 'click', {} ) );

        const target = document.querySelector( 'input' );
        expect( target!.checked ).toBe( true );
    } );


    it( 'can make a checkbox input to receive a JSON object and extract a value as checked', () => {

        document.body.innerHTML = `
            <button
                data-value="{'example': true}"
                send="data-value|click|input|json"
            >Click Me</button>

            <input type="checkbox" receive-as="checked" on-receive="obj => obj.example" />
        `;

        register( document.body, { window: window as unknown as Win } );

        const source = document.querySelector( 'button' );
        source!.dispatchEvent( new window.Event( 'click', {} ) );

        const target = document.querySelector( 'input' );
        expect( target!.checked ).toBe( true );
    } );


    describe.skip( 'send as with primitive, non-string values', () => {

        it( 'can send as number', () => {

            document.body.innerHTML = `
                <button
                    data-value="1"
                    send="data-value|click|#out|number"
                >Click Me</button>
                <output id="out" on-receive="( v, { document } ) => Number( document.querySelector( '#out' ).value ) + v" >0</output>
            `;
                // <output id="out" receive-as="value" on-receive="v => Number( out.value ) + v" >0</output>

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'button' )!;
            source.dispatchEvent( new window.Event( 'click', {} ) );

            const target = document.querySelector( 'output' )!;
            expect( target.value ).toBe( '1' );
        } );


        it( 'can send as int', () => {

            document.body.innerHTML = `
                <button
                    data-value="1.5"
                    send="data-value|click|#out|int"
                >Click Me</button>
                <output id="out" on-receive="( v, { document } ) => Number( document.querySelector( '#out' ).value ) + v" >0</output>
            `;

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'button' )!;
            source.dispatchEvent( new window.Event( 'click', {} ) );

            const target = document.querySelector( '#out' )!;
            expect( ( target as HTMLInputElement ).value ).toBe( '1' );
        } );


        it( 'can send as float', () => {

            document.body.innerHTML = `
                <button
                    data-value="1.5"
                    send="data-value|click|#out|float"
                >Click Me</button>
                <output id="out" on-receive="v => Number( out.value ) + v" >0</output>
            `;

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'button' )!;
            source.dispatchEvent( new window.Event( 'click', {} ) );

            const target = document.querySelector( '#out' )!;
            expect( ( target as HTMLInputElement ).value ).toBe( '1.5' );
        } );


        it( 'can send as boolean with "true"', () => {

            document.body.innerHTML = `
                <button
                    data-value="true"
                    send="data-value|click|#out|boolean"
                >Click Me</button>
                <output id="out" on-receive="v => v === true ? 'true' : 'false'" >?</output>
            `;

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'button' )!;
            source.dispatchEvent( new window.Event( 'click', {} ) );

            const target = document.querySelector( '#out' )!;
            expect( ( target as HTMLInputElement ).value ).toBe( 'true' );
        } );


        it( 'can send as boolean with "1"', () => {

            document.body.innerHTML = `
                <button
                    data-value="1"
                    send="data-value|click|#out|boolean"
                >Click Me</button>
                <output id="out" on-receive="v => v === true ? 'true' : 'false'" >?</output>
            `;

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'button' )!;
            source.dispatchEvent( new window.Event( 'click', {} ) );

            const target = document.querySelector( '#out' );
            expect( ( target as HTMLInputElement ).value ).toBe( 'true' );
        } );

    } );


    describe( 'send as json', () => {

        it( 'allows a target to transforming JSON data when receiving it', () => {

            document.body.innerHTML = `
                <div
                    send-prop="data-id"
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

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'div' )!;
            source.dispatchEvent( new window.Event( 'click', {} ) );

            expect( source.getAttribute( 'data-id' ) ).toBe( '{ value: 10 }' );

            const target = document.querySelector( '#foo' )!;
            expect( ( target as HTMLElement ).innerText ).toBe( '10' );
        } );


        it( 'allows to use JSON with properties with single quotes', () => {

            document.body.innerHTML = `
                <div
                    send-prop="data-id"
                    send-on="click"
                    send-to="#foo"
                    data-id="{ 'value': 10 }"
                    send-as="json"
                ></div>

                <div id="foo"
                    on-receive="( obj ) => obj.value"
                    receive-as="text"
                ></div>
            `;

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'div' )!;
            source.dispatchEvent( new window.Event( 'click', {} ) );

            const target = document.querySelector( '#foo' )!;
            expect( ( target as HTMLElement ).innerText ).toBe( '10' );
        } );


    } );

    describe( '$history', () => {

        it( 'can send a value to the browser history', () => {

            // data-url is empty to avoid security errors during the test
            document.body.innerHTML = `
                <div
                data-url=""
                send-prop="data-url"
                send-on="click"
                send-to="$history"
                >Foo</div>
            `;

            register( document.body, { window: window as unknown as Win } );

            expect( window!.history.length ).toBe( 1 );

            const spy = vi.spyOn( window!.history, 'pushState' );

            const source = document.querySelector( 'div' );
            const event = new window.Event( 'click', {} );
            source!.dispatchEvent( event );

            expect( spy ).toHaveBeenCalled();

            vi.restoreAllMocks()
        } );
    } );


    describe( 'prevent', () => {

        it( 'can prevent the default behavior in a click', () => {

            // console.log( window.location.href );

            // data-url is empty to avoid security errors during the test
            document.body.innerHTML = `
                <a
                    href="/foo"
                    prevent
                    send-prop="href"
                    send-on="click"
                    send-to="div"
                >Foo</a>

                <div receive-as="text" ></div>
            `;

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'a' );
            const event = new window.Event( 'click', {} );
            source!.dispatchEvent( event );

            expect( window!.location.href ).not.toBe( '/foo' );

            const target = document.querySelector( 'div' );
            expect( ( target as HTMLElement ).innerText ).toBe( '/foo' );
        } );

    });


    describe( 'fetch', () => {

        it( 'can fetch an HTML content using "receive-as" with the received url', async () => {

            document.body.innerHTML = `
                <div
                    data-url="https://google.com"
                    send-prop="data-url"
                    send-on="click"
                    send-to="#x"
                >Foo</div>

                <div id="x"
                    receive-as="fetch-html"
                    on-receive-error="(e,target) => console.log( e, target )"
                ></div>
            `;

            register( document.body, { fetch, window: window as unknown as Win } );

            // fetch.mockResponseOnce( '<html></html>' );
            fetchMock.mockGlobal().get( 'https:/google.com', '<html></html>' );

            const source = document.querySelector( 'div' );
            source!.dispatchEvent( new window.Event( 'click', {} ) );

            // await sleep( 1000 );

            const target = document.querySelector( '#x' )!;
            await waitForEvent( target, EVENT_DOM_LOADED );

            expect( target!.innerHTML ).toContain( 'html' );
        } );



        it( 'can fetch an HTML content using "send-as" with the sent url', async () => {

            document.body.innerHTML = `
                <div
                    data-url="https://google.com"
                    send-prop="data-url"
                    send-on="click"
                    send-to="#x"
                    send-as="fetch-html"
                    on-send-error="(e,target) => console.log( e, target )"
                >Foo</div>

                <div id="x"
                    receive-as="html"
                ></div>
            `;

            register( document.body, { fetch, window: window as unknown as Win } );

            // fetch.mockResponseOnce( '<html></html>' );
            fetchMock.mockGlobal().get( 'https://google.com', '<html></html>' );

            const source = document.querySelector( 'div' )!;
            source.dispatchEvent( new window.Event( 'click', {} ) );

            await waitForEvent( source, EVENT_FETCH_SUCCESS );

            const target = document.querySelector( '#x' )!;
            expect( target.innerHTML ).toContain( 'html' );
        } );


        it( 'can fetch a JSON content using "send-as" with the sent url', async () => {

            document.body.innerHTML = `
                <div
                    data-url="https://jsonplaceholder.typicode.com/todos/1"
                    send-prop="data-url"
                    send-on="click"
                    send-to="#x"
                    send-as="fetch-json"
                    on-send-error="(e,target) => console.log( e, target )"
                >Foo</div>

                <div id="x"
                    on-receive="( toDo ) => toDo.title";
                    receive-as="text"
                ></div>
            `;

            register( document.body, { window: window as unknown as Win } );

            const obj = {
                "userId": 1,
                "id": 1,
                "title": "delectus aut autem",
                "completed": false
            };

            // fetch.mockResponseOnce(  objStr );
            fetchMock.mockGlobal().get( 'https://jsonplaceholder.typicode.com/todos/1', obj );

            const source = document.querySelector( 'div' )!;
            source.dispatchEvent( new window.Event( 'click', {} ) );

            // await sleep( 1 );
            await waitForEvent( source, EVENT_FETCH_SUCCESS );

            const target = document.querySelector( '#x' )!;
            expect( ( target as HTMLElement ).innerText ).toContain( 'delectus aut autem' );
        } );


        it( 'can fetch a JSON content using "receive-as" with the received url', async () => {

            document.body.innerHTML = `
                <div
                    data-url="https://jsonplaceholder.typicode.com/todos/1"
                    send-prop="data-url"
                    send-on="click"
                    send-to="#x"
                    send-as="text"
                >Foo</div>

                <div id="x"
                    receive-as="fetch-json"
                    on-receive-error="(e,target) => console.log( e, target )"
                ></div>
            `;

            register( document.body, { window: window as unknown as Win } );

            const obj = {
                "userId": 1,
                "id": 1,
                "title": "delectus aut autem",
                "completed": false
            };

            // fetch.mockResponseOnce( objStr );
            fetchMock.mockGlobal().get( 'https://jsonplaceholder.typicode.com/todos/1', obj );

            const source = document.querySelector( 'div' )!;
            source.dispatchEvent( new window.Event( 'click', {} ) );

            await sleep( 1 );

            const target = document.querySelector( '#x' )!;
            expect( ( target as HTMLElement ).innerText ).toContain( 'delectus aut autem' );
        } );



        it( 'can fetch an TEXT content using "send-as" with the sent url', async () => {

            document.body.innerHTML = `
                <div
                    data-url="https://wikipedia.org"
                    send-prop="data-url"
                    send-on="click"
                    send-to="#x"
                    send-as="fetch-text"
                    on-send-error="(e,target) => console.log( e, target )"
                >Foo</div>

                <div id="x"
                    receive-as="html"
                ></div>
            `;

            register( document.body, { fetch, window: window as unknown as Win } );

            // fetch.mockResponseOnce( '<html></html>' );
            fetchMock.mockGlobal().get( 'https://wikipedia.org', '<html></html>' );

            const source = document.querySelector( 'div' )!;
            source.dispatchEvent( new window.Event( 'click', {} ) );

            await waitForEvent( source, EVENT_FETCH_SUCCESS );

            const target = document.querySelector( '#x' )!;
            expect( target.innerHTML ).toContain( 'html' );
        } );


        it( 'can fetch a TEXT content using "receive-as" with the received url', async () => {

            document.body.innerHTML = `
                <div
                    data-url="https://wikipedia.org"
                    send-prop="data-url"
                    send-on="click"
                    send-to="#x"
                    send-as="text"
                >Foo</div>

                <div id="x"
                    receive-as="fetch-text"
                    on-receive-error="(e,target) => console.log( e, target )"
                ></div>
            `;

            register( document.body, { window: window as unknown as Win } );

            // fetch.mockResponseOnce( '<html></html>' );
            fetchMock.mockGlobal().get( 'https://wikipedia.org', '<html></html>' );

            const source = document.querySelector( 'div' )!;
            source.dispatchEvent( new window.Event( 'click', {} ) );

            await sleep( 1 );

            const target = document.querySelector( '#x' );
            expect( ( target as HTMLElement ).innerText ).toContain( 'html' );
        } );

    } );


    describe( 'send-element', () => {

        it( 'can send an element', () => {

            const element = '<p>Hello</p>';

            document.body.innerHTML = `
                ${element}

                <div
                    send-element="p"
                    send-on="click"
                    send-to="#x"
                    send-as="element"
                >Foo</div>

                <div id="x" receive-as="element" ></div>
            `;

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'div' );
            const event = new window.Event( 'click', {} );
            source!.dispatchEvent( event );

            const target = document.querySelector( '#x' );
            expect( target!.innerHTML ).toContain( element );
        } );


        it( 'can send an element clone', () => {

            const element = '<p>Hello</p>';

            document.body.innerHTML = `
                ${element}

                <div
                    send-element="p"
                    send-on="click"
                    send-to="#x"
                    send-as="element-clone"
                >Foo</div>

                <div id="x" receive-as="element" ></div>
            `;

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'div' );
            const event = new window.Event( 'click', {} );
            source!.dispatchEvent( event );

            const target = document.querySelector( '#x' );
            expect( target!.innerHTML ).toContain( element );

            const firstP = document.querySelector( 'p' );
            firstP!.innerText = 'Hello World';

            expect( target!.innerHTML ).toContain( element ); // Keeps the old value
        } );


        it( 'can receive an element clone', () => {

            const element = '<p>Hello</p>';

            document.body.innerHTML = `
                ${element}

                <div
                    send-element="p"
                    send-on="click"
                    send-to="#x"
                    send-as="element"
                >Foo</div>

                <div id="x" receive-as="element-clone" ></div>
            `;

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'div' );
            const event = new window.Event( 'click', {} );
            source!.dispatchEvent( event );

            const target = document.querySelector( '#x' );
            expect( target!.innerHTML ).toContain( element );

            const firstP = document.querySelector( 'p' );
            firstP!.innerText = 'Hello World';

            expect( target!.innerHTML ).toContain( element ); // Keeps the old value
        } );


        it( 'can send as HTML and can receive as an element', () => {

            const element = '<p>Hello</p>';

            document.body.innerHTML = `
                ${element}

                <div
                    send-element="p"
                    send-on="click"
                    send-to="#x"
                    send-as="html"
                >Foo</div>

                <div id="x" receive-as="element" ></div>
            `;

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'div' );
            const event = new window.Event( 'click', {} );
            source!.dispatchEvent( event );

            const target = document.querySelector( '#x' );
            expect( target!.innerHTML ).toContain( element );
        } );



        it( 'can send as HTML and can receive as an element clone', () => {

            const element = '<p>Hello</p>';

            document.body.innerHTML = `
                ${element}

                <div
                    send-element="p"
                    send-on="click"
                    send-to="#x"
                    send-as="html"
                >Foo</div>

                <div id="x" receive-as="element-clone" ></div>
            `;

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'div' );
            const event = new window.Event( 'click', {} );
            source!.dispatchEvent( event );

            const target = document.querySelector( '#x' );
            expect( target!.innerHTML ).toContain( element );

            const firstP = document.querySelector( 'p' );
            firstP!.innerText = 'Hello World';

            expect( target!.innerHTML ).toContain( element ); // Keeps the old value
        } );


        it( 'must not allow to use both "send-prop" and "send-element"', () => {

            document.body.innerHTML = `
                <p>Hello</p>

                <div
                    foo="bar"
                    send-element="p"
                    send-prop="foo"
                    send-on="click"
                    send-to="#x"
                    send-as="html"
                >Foo</div>

                <div id="x" receive-as="element-clone" ></div>
            `;

            expect( () => {
                register( document.body, { window: window as unknown as Win } );
            } ).toThrowError();
        } );


        describe( 'element-clone with a template', () => {

            it( 'will clone the template content when declared in "send-as"', () => {

                const element = '<p>Hello</p>';

                document.body.innerHTML = `
                    <template>
                    ${element}
                    </template>

                    <div
                        send-element="template"
                        send-on="click"
                        send-to="#x"
                        send-as="element-clone"
                    >Foo</div>

                    <div id="x" receive-as="element" ></div>
                `;

                register( document.body, { window: window as unknown as Win }  );

                const source = document.querySelector( 'div' );
                const event = new window.Event( 'click', {} );
                source!.dispatchEvent( event );

                const target = document.querySelector( '#x' );
                expect( target!.innerHTML ).not.toContain( 'template' );
                expect( target!.innerHTML ).toContain( element );
            } );


            it( 'will clone the template content when declared in "receive-as"', () => {

                const element = '<p>Hello</p>';

                document.body.innerHTML = `
                    <template>
                    ${element}
                    </template>

                    <div
                        send-element="template"
                        send-on="click"
                        send-to="#x"
                        send-as="element"
                    >Foo</div>

                    <div id="x" receive-as="element-clone" ></div>
                `;

                register( document.body, { window: window as unknown as Win }  );

                const source = document.querySelector( 'div' );
                const event = new window.Event( 'click', {} );
                source!.dispatchEvent( event );

                const target = document.querySelector( '#x' );
                expect( target!.innerHTML ).not.toContain( 'template' );
                expect( target!.innerHTML ).toContain( element );
            } );

        } );


        it( 'can handle the element in "on-receive" when "send-element" is used', () => {

            const element = '<p>Hello</p>';

            document.body.innerHTML = `
                ${element}

                <div
                    send-element="p"
                    send-on="click"
                    send-to="#x"
                    send-as="element"
                >Foo</div>

                <div id="x"
                    on-receive="(el) => { el.textContent = 'World'; return el; }"
                    receive-as="element"
                ></div>
            `;

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'div' );
            const event = new window.Event( 'click', {} );
            source!.dispatchEvent( event );

            const target = document.querySelector( '#x' );
            expect( target!.innerHTML ).toContain( 'World' );
        } );

    } );


    describe( 'send-on', () => {

        it( 'can execute on "domcontentloaded"', () => {
            const element = '<p>Hello</p>';

            document.body.innerHTML = `
                ${element}

                <div
                    send-element="p"
                    send-on="domcontentloaded"
                    send-to="#x"
                    send-as="element"
                >Foo</div>

                <div id="x" receive-as="element" ></div>
            `;

            register( document.body, { document, window: window as unknown as Win } );

            const source = document.querySelector( 'div' )!;
            source.dispatchEvent( new window.Event( EVENT_DOM_LOADED) );

            const target = document.querySelector( '#x' );
            expect( target!.textContent ).toContain( 'Hello' );
        } );



        it( 'makes an element to forward its content when "send-on" is "receive"', () => {

            document.body.innerHTML = `
                <div
                    send-prop="text"
                    send-on="click"
                    send-to="#x"
                >Foo</div>

                <div id="x"
                    receive-as="text"
                    send-prop="text"
                    send-on="receive"
                    send-to="#y"
                ></div>

                <div id="y"
                    receive-as="text"
                ></div>
            `;

            register( document.body, { document, window: window as unknown as Win } );

            const source = document.querySelector( 'div' );
            const event = new window.Event( 'click', {} );
            source!.dispatchEvent( event );

            const target1 = document.querySelector( '#x' ) as HTMLElement;
            expect( target1.innerText ).toContain( 'Foo' );

            const target2 = document.querySelector( '#y' ) as HTMLElement;
            expect( target2.innerText ).toContain( 'Foo' );
        } );


        it( 'can change the content before forwarding', () => {

            document.body.innerHTML = `
                <div
                    send-prop="text"
                    send-on="click"
                    send-to="#x"
                >Foo</div>

                <div id="x"
                    receive-as="text"
                    on-receive="s => s + '!!'"
                    send-prop="text"
                    send-on="receive"
                    send-to="#y"
                ></div>

                <div id="y"
                    receive-as="text"
                ></div>
            `;

            register( document.body, { document, window: window as unknown as Win  } );

            const source = document.querySelector( 'div' );
            const event = new window.Event( 'click', {} );
            source!.dispatchEvent( event );

            const target1 = document.querySelector( '#x' ) as HTMLElement;
            expect( target1.innerText ).toContain( 'Foo!!' );

            const target2 = document.querySelector( '#y' ) as HTMLElement;
            expect( target2.innerText ).toContain( 'Foo!!' );
        } );


        it( 'process all the "on-receive" events in the chain', () => {

            document.body.innerHTML = `
                <div
                    send-prop="text"
                    send-on="click"
                    send-to="#x"
                >Foo</div>

                <div id="x"
                    receive-as="text"
                    on-receive="s => s + '!'"
                    send-prop="text"
                    send-on="receive"
                    send-to="#y"
                ></div>

                <div id="y"
                    receive-as="text"
                    on-receive="s => s + '?'"
                ></div>
            `;

            register( document.body, { document, window: window as unknown as Win } );

            const source = document.querySelector( 'div' );
            const event = new window.Event( 'click', {} );
            source!.dispatchEvent( event );

            const target1 = document.querySelector( '#x' ) as HTMLElement;
            expect( target1.innerText ).toContain( 'Foo!' );

            const target2 = document.querySelector( '#y' ) as HTMLElement;
            expect( target2.innerText ).toContain( 'Foo!?' );
        } );


        it( 'throws an exception when either "send-prop" or "send-element" is not defined', async () => {

            document.body.innerHTML = `
                <div
                    send-prop="text"
                    send-on="click"
                    send-to="#x"
                >Foo</div>

                <div id="x"
                    receive-as="text"
                    send-on="receive"
                    send-to="#y"
                ></div>

                <div id="y"
                    receive-as="text"
                ></div>
            `;

            expect( () => {
                register( document.body, { document, window: window as unknown as Win } );
                const source = document.querySelector( 'div' )!;
                source.dispatchEvent( new window.Event( 'click', {} ) );
            } ).toThrow();
        } );

    } );


    describe( 'send', () => {

        it( 'can send the input value to another element\'s text when the input changes', () => {

            document.body.innerHTML = `
                <input
                    send="value|change|div"
                />

                <div
                  receive-as="text"
                ></div>
            `;

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'input' );
            source!.value = 'Hello';

            const event = new window.Event( 'change', {} );
            source!.dispatchEvent( event );

            const target = document.querySelector( 'div' );
            expect( ( target as HTMLElement ).innerText ).toBe( 'Hello' );
        } );


        it( 'can send an element', () => {

            const element = '<p>Hello</p>';

            document.body.innerHTML = `
                ${element}

                <div
                    send="{p}|click|#x"
                >Foo</div>

                <div id="x" receive-as="element" ></div>
            `;

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'div' );
            const event = new window.Event( 'click', {} );
            source!.dispatchEvent( event );

            const target = document.querySelector( '#x' );
            expect( target!.innerHTML ).toContain( element );
        } );


        it( 'can send a content only once when true is passed after the format', async () => {

            document.body.innerHTML = `
                <div
                    data-x="10"
                    send="data-x|click|#x|text|true"
                >Click Me</div>

                <div id="x" receive-as="text" ></div>
            `;

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'div' );
            const target = document.querySelector( '#x' );
            const event = new window.Event( 'click', {} );

            source!.dispatchEvent( event );
            expect( ( target as HTMLElement ).innerText ).toContain( '10' );

            ( target as HTMLElement ).innerText = '20';
            source!.dispatchEvent( event );
            expect( ( target as HTMLElement ).innerText ).toContain( '20' ); // Not '10'
        } );


    } );


    describe( 'form', () => {

        it( 'can send data as JSON when "send-as" is declared accordingly', async () => {

            const url = 'http://foo.com/bar';

            document.body.innerHTML = `
                <form send-as="json" action="${url}" method="POST" >
                    <input name="name" value="Bob" />
                    <button type="submit" >OK</button>
                </form>
            `;

            register( document.body, { window: window as unknown as Win } );

            fetchMock.mockGlobal();

            const source = document.querySelector( 'form' )!;
            source.dispatchEvent( new window.Event( 'submit', {} ) );

            expect( fetchMock ).toHavePosted( url, { body: { name: 'Bob' }, response: { status: 200 } } );
        } );

    } );


    describe( 'send-once', () => {

        it( 'makes the element to send only once', async () => {

            document.body.innerHTML = `
                <div
                    data-x="10"
                    send-prop="data-x"
                    send-on="click"
                    send-to="#x"
                    send-once
                >Click Me</div>

                <div id="x" receive-as="text" ></div>
            `;

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'div' );
            const target = document.querySelector( '#x' );
            const event = new window.Event( 'click', {} );

            source!.dispatchEvent( event );
            expect( ( target as HTMLElement ).innerText ).toContain( '10' );

            ( target as HTMLElement ).innerText = '20';
            source!.dispatchEvent( event );
            expect( ( target as HTMLElement ).innerText ).toContain( '20' ); // Not '10'
        } );


        it( 'when omitted, the element keeps sending the content', async () => {

            document.body.innerHTML = `
                <div
                    data-x="10"
                    send-prop="data-x"
                    send-on="click"
                    send-to="#x"
                >Click Me</div>

                <div id="x" receive-as="text" ></div>
            `;

            register( document.body, { window: window as unknown as Win } );

            const source = document.querySelector( 'div' );
            const target = document.querySelector( '#x' );
            const event = new window.Event( 'click', {} );

            source!.dispatchEvent( event );
            expect( ( target as HTMLElement ).innerText ).toContain( '10' );

            ( target as HTMLElement ).innerText = '20';
            source!.dispatchEvent( event );
            expect( ( target as HTMLElement ).innerText ).toContain( '10' );
        } );

    } );

} );