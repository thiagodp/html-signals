import { test, expect } from '@playwright/test';

test.describe( 'number', () => {

    test.beforeEach( async ({ page }) => {
        await page.goto( 'http://localhost:8080/test.html' );
        // await page.addInitScript( { path: 'dist/index.esm.js' } );
    } );

    test.afterEach( async ({ page }) => {
        // await page.addInitScript( { content: 'unregister();' } );
        await page.evaluate( () => {

            const script = document.createElement( 'script' );
            script.type = 'module';
            script.innerText = `
                import { register } from 'dist/index.esm.js';
                register( document.body );
            `;

            document.body.append( script );
        } );
    } );

    test( 'works', async ({ page }) => {
        await page.evaluate( () => {
            document.body.innerHTML = `
                <div send="text|click|span" >Hi</div>
                <span receive-as="text" ></span>
            `;

            const script = document.createElement( 'script' );
            script.type = 'module';
            script.innerText = `
                import { register } from 'dist/index.esm.js';
                register( document.body );
            `;
            document.body.append( script );
        } );
        // await page.addInitScript( { content: 'register();' } );
        await page.click( 'div' );
        expect( await page.textContent( 'span' ) ).toBe( 'Hi' );
    } );

});