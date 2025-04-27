[![npm (tag)](https://img.shields.io/npm/v/html-signals?color=green&label=NPM&style=for-the-badge)](https://github.com/thiagodp/html-signals/releases)
[![License](https://img.shields.io/npm/l/html-signals.svg?style=for-the-badge&color=green)](https://github.com/thiagodp/html-signals/blob/master/LICENSE.txt)
[![npm](https://img.shields.io/npm/dt/html-signals?style=for-the-badge&color=green)](https://www.npmjs.com/package/html-signals)

# html-signals

> HTML properties for reducing the need of writing JavaScript code

⚠️ **Work-In-Progress!**

## Basic ideas

In a web application user interface, the application state is usually managed with JavaScript. Variables store the result of input validations, computations, data to send to the server, user preferences, and so on. However, HTML is capable of holding these state values. Native HTML components can store application state as objects, numbers, strings, booleans, and other data types easily. That state can be generated on the back-end and embedded within HTML components or generated on the front-end when needed. New HTML properties can share state among components using **send and receive primitives**. For example, a sender component may share its state when a DOM event occurs, while a receiver component can, if necessary, transform the state before consuming it or passing it along to another component. State is kept and transformed by the user interface as the user interacts with it.

Moreover, forms and other components can leverage new properties to enhance their behavior and better adapt to modern application needs.


## Features

- 🪄 Make it easy to query server state, store it and share it among HTML elements
- 🚀 Make it possible that forms send JSON data, custom headers, and use different HTTP methods
- 🎯 Create SPA-related behavior (routes, html replacement) without writing any related JavaScript code.
  - _WORK-IN-PROGRESS_
  - _Partially supported!_ See [`examples/spa.html`](examples/spa.html) and See [`examples/spa-js.html`](examples/spa-js.html)
- 🧠 Short learning curve
- 📢 Pure HTML properties
- 🧩 Also works with third-party components
- ⚡ Fast, vanilla JavaScript
- 📦 Just 9k unzipped (code), no external dependencies
- 🛡️ Unit tested


## Installation

```bash
npm i html-signals
```

## Usage

👉 Just include the library in your application and call `register()`.

Example using a CDN (_you can copy-and-paste to see it working; no installation required_):
```html
<body>
    <p>This form will send its data as JSON and present any errors in the div element</p>
    <form method="POST" action="/foo" send-as="json"
        on-send-error="error => msg.innerText = 'Ouch... ' + error.message;"
        >
        <label for="name" >Name:</label>
        <input type="text" name="name" id="name" required />
        <button type="submit" >Send</button>
        <div id="msg" ></div>
    </form>

    <script type="module" >
        import { register } from "https://unpkg.com/html-signals/dist/index.esm.js";
        register(); // Done
    </script>
</body>
```

📝 **The documentation is being improved** - please see the [tests](/test/index.spec.ts) or **[examples](/examples/)** for now.


### Functions

Just two functions to use:

```typescript

/**
 * Register new behavior for your HTML elements.
 *
 * @param root Element in which your HTML elements with extended properties will be declared. By default, it is `document.body`.
 * @param options Object with some options, such as:
 *  - `sanitizer?: ( html: string ) => string` function for sanitizing HTML values.
 */
export function register( root?: HTMLElement, options?: Options ): void;

/**
 * Unregister the new behavior for your HTML elements, and cancel all ongoing fetch events eventually started by them.
 */
export function unregister(): void;
```

## Properties for HTML elements

### Primitives

🚀 _Tip_: The property `send` can replace all these properties at once: `send-prop`, `send-element`, `send-on`, `send-to`, `send-as`.

  - `send-prop` indicates a property to be sent to another component. Example:
    ```html
    <!-- When clicked, this anchor will send its 'href' value to the span -->
    <a href="/foo" prevent send-prop="href" send-on="click" send-to="span" >Click Me</a>
    <p>Take me to <span>...</span></p>
    ```

  - `send-element` indicates an HTML element to be sent to another element. Example:
    ```html
    <!-- When clicked, the first div will send the template content (clone) to the div with id "clock" -->
    <template><p>⏱️</p></template>
    <div send-element="template" send-on="click" send-to="#clock" >Show Clock</div>
    <div id="clock" receive-as="element" ></div>
    ```

  - `send-to` indicates a query selector that contain the elements to send a content. Example:
    ```html
    <!-- When clicked, the first div will send its 'data-hello' value to the divs with id "one" and "two" -->
    <div data-hello="Hello!" send-prop="data-hello" send-on="click" send-to="#one,#two" >Say Hello</div>
    <div id="one" ></div>
    <div id="two" ></div>
    ```

  - `send-as` indicates the format of the content to send:
    - `"text"` - that is the _default value_
    - `"html"`
    - `"number"`
    - `"int"`
    - `"float"`
    - `"boolean"` (admits `"true"` or `"1"` as `true`, and `false` otherwise)
    - `"json"` - values must contain unquoted or single-quoted properties only (HTML limitation)
    - `"fetch-html"` (html, css)
    - `"fetch-html-js"` (html, css, javascript)
    - `"fetch-json"`
    - `"fetch-text"`
    - `"element"`
    - `"element-clone"`
    - more options to appear ⌛

  - `send-on` indicates in which event the element will send the content.
    - _any DOM event supported by the element_, such as `"click"`, `"change"`, `"blur"`, `"focus"` etc.
    - `"domcontentloaded"` - that will trigger when the DOM is loaded.
    - `"receive"` - that will forward a content to other element(s)
    - more options to appear ⌛

  - `on-send-error` to indicate a function to execute when a content is sent and an error occurs - usually for `fetch-*` values in `send-as`.
    - The function receives:
      - an `Error` object as the first argument;
      - the target HTML element, that receives the error, as the second argument; and
      - a `fetch`'s `Response` object as the third argument, if a `fetch-*` format is used.
    Example:
    ```html
    <!-- When the div is clicked, it will fetch the JSON content from the URL, and send it to the paragraph -->
    <div
        data-url="https://jsonplaceholder.typicode.com/todos/1"
        send="data-url|click|#x|fetch-json"
        on-send-error="(error, target, response) => console.log(error, target, response)"
    >Click me</a>

    <p id="x" receive-as="text" ></p>
    ```

  - `send-once` indicates that the event must be executed only once.
    - Syntax: `send-once`, or `send-once` with a boolean false.
    - Example:
    ```html
    <!-- In the first time when the div is clicked, it will send the content of "data-x" to the span -->
    <div data-x="100" send-prop="data-x" send-on="click" send-to="span"
        send-once
    >Click me</a>
    <span receive-as="text" ></span>
    ```

  - `send`, that can be used as a replacement to all these properties at once: `send-prop`, `send-element`, `send-on`, `send-to`, `send-as`, `send-once`.
    - _Syntax 1_: `send="property to send|event|target element(s)|format|once"`, where:
      - `format` is optional (default `text`).
      - `once` is optional (default `false`). When defined, it must be placed after `format`.
      - Example:
      ```html
      <!-- When changed, the input will send its value as text to the div element. -->
      <input send="value|change|div" /> <div receive-as="text" ></div>
      ```
    - _Syntax 2_: `send="{query selector for the element to send}|event|target element(s)|format|once"`, where:
      - `format` is optional (default `text`).
      - `once` is optional (default `false`). When defined, it must be placed after `format`.
      - Example:
      ```html
      <!-- When clicked, the div will send the paragraph element to the span with id "bar" -->
      <div send="{p}|click|#bar" >Click Me</div>
      <p>Hello</p>
      <span id="bar" receive-as="element" ></span>
      ```

  - `receive-as` to indicate the receiving format:
    - `"text"`
    - `"html"`
    - `"number"`
    - `"int"`
    - `"float"`
    - `"boolean"` (admits `"true"` or `"1"` as `true`, and `false` otherwise)
    - `"json"`
    - `"fetch-html"` (html, css)
    - `"fetch-html-js"` (html, css, javascript)
    - `"fetch-json"`
    - `"fetch-text"`
    - `"element"`
    - `"element-clone"`
    - more options to appear ⌛

  - `on-receive` to indicate a (synchronous) function to execute before a content is received. The function can be used to transform a content. Examples:
    ```html
    <!-- When clicked, the div will send its text, "Hello", to the span.
         Then the span will change the text to "Hello, World!". -->
    <div send="text|click|span" >Hello</div>
    <span on-receive="text => `${text}, World!`" ></span>

    <!-- When clicked, button will send its JSON object in "data-contact" to the span elements.
         Then first span will extract and show the name (from the object), while the second will extract and show the surname. -->
    <button data-contact="{name: 'Bob', surname: 'Dylan'}" send="data-contact|click|span|json" >Click Me</button>
    <span on-receive="obj => obj.name"     ></span>
    <span on-receive="obj => obj.surname"  ></span>
    ```

  - `on-receive-error` to indicate a function to execute when a content is received and an error occurs - usually for `fetch-*` values in `receive-as`.
    - The function receives:
      - an `Error` object as the first argument;
      - the target HTML element, that receives the error, as the second argument; and
      - a `fetch`'s `Response` object as the third argument, if a `fetch-*` format is used.
    Example:
    ```html
    <!-- When the div is clicked, it will send the URL to the paragraph, that will fetch the JSON content from it -->
    <div
        data-url="https://jsonplaceholder.typicode.com/todos/1"
        send="data-url|click|#x|text"
    >Click me</a>

    <p id="x"
        receive-as="fetch-json"
        on-receive-error="(error, target, response) => console.log(error, target, response)"
    ></p>
    ```


### Forms

1. A **form** `method` can use `PUT`, `PATCH` and `DELETE` (version `0.11.0`+).
    - Currently, there must be an input element named `id` to store that value that will be dynamically added to the URL in `action`. That `id` element can be set as `hidden`. Example:
    ```html
    <!-- This will send an HTTP `DELETE` to `/foo/10` -->
    <form method="DELETE" action="/foo" >
      <input type="hidden" name="id" value="10" />
      <button type="submit" >Delete</button>
    </form>
    ```
    - When `POST`, `PUT` or `PATCH` are used, the `send-as` property can use these values:
      - `"form"`, that is the _default_ value, will send as `application/x-www-form-urlencoded`;
      - `"json"` will send as `application/json`;
      - `"multipart"` will send as `multipart/form-data`.
    - Example:
    ```html
    <!-- This will send an HTTP POST to "/foo" with a JSON object, such as {"name": "Bob"} -->
    <form method="POST" action="/foo" send-as="json" >
      <label for="name" >Name:</label>
      <input type="text" name="name" id="name" required />
      <button type="submit" >Send</button>
    </form>
    ```


2. A **form** can use the property `headers` with additional HTTP headers with single-quoted JSON (version `0.13.0`+). Example:
    ```html
    <!-- This will send a `PUT` to `/foo/10` with the additional headers `"X-Foo"` with `"Hello"` and `"X-Bar"` with `"World"` -->
    <form method="PUT" action="/foo" headers="{'X-Foo':'Hello', 'X-Bar':'World'}" >
      <input type="hidden" name="id" value="10" />
      <label for="name" >Name:</label>
      <input type="text" name="name" id="name" required />
      <button type="submit" >Send</button>
    </form>
    ```
    - Additional headers can subscribe default headers, if desired. Example: `headers="{'Content-Type': 'text/plain'}"`.


### Additional properties

  - `prevent` - to call preventDefault() on elements such as `<a>` and `<form>`.

  - `headers` - specify headers to include in an HTTP request, using JSON format with unquoted or single-quoted properties.
    - Example: `headers="{'Accept': 'text/plain'}"`
    - Headers are considered for `fetch-*` values declared in `receive-as` or `send-as`.


### Special values

- `$history` can be used by `send-to` or `send` for adding a URL to the browser history - e.g. send-to="$history"


### Notes

- `send-prop` and `send-element` must not be used together.
- When `"element-clone"` references a `<template>` tag, it will clone the template's content.
- By default, `fetch` calls will include the option `{ credentials: 'include' }` for sending cookies and authentication headers to the server.


### Limitations

- JSON content in element properties must have unquoted or single-quoted properties (HTML limitation)
  - ex.: `<span data-todo="{ title: 'Buy coffee', completed: false }" ></span>`
  - ex.: `<span data-todo="{ 'title': 'Buy coffee', 'completed': false }" ></span>`
- `$history` must be at the beginning or at the end of "send-to"


## License

[MIT](/LICENSE) © [Thiago Delgado Pinto](https://github.com/thiagodp)
