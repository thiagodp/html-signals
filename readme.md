# html-signals

> HTML properties to reduce the need of writing JavaScript code

👉 **Work-In-Progress! API is not stable yet and things may change.**

📝 **Documentation to be improved** - see [tests](/test/index.spec.ts) or [examples](/examples/) for now.

### Usage

⌛ *Soon*

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

### Properties for HTML elements

1. A **form** element can also use `method` with `PUT`, `PATCH` and `DELETE`.
  - There must be an input element named `id` that can be hidden;
  - The value of the element named `id` will be dynamically added to the URL in `action`
    - Example that will send a HTTP `DELETE` to `/foo/10`:
    ```html
    <form method="DELETE" action="/foo" >
      <input type="hidden" name="id" value="10" />
      <button type="submit" >Delete</button>
    </form>
    ```
  - When `PUT` or `PATCH` are used, `send-as` can be used with:
    - `"form"`, that is the _default_ value, will send as `application/x-www-form-urlencoded`;
    - `"json"` will send as `application/json`;
    - `"multipart"` will send as `multipart/form-data`.

2. Any **HTML element** can possibly use the following properties to augment their behavior:

- `send-prop` with a single property (changed from `send-what` after version `0.8.0`)

- `send-element` with a single element

- `send-to` with query selector

- `send-as` with:
  - "text"
  - "html"
  - "number"
  - "int"
  - "float"
  - "json" - values must contain unquoted or single-quoted properties only (HTML limitation)
  - "fetch-html" (html, css)
  - "fetch-html-js" (html, css, javascript)
  - "fetch-json"
  - "fetch-text"
  - "element"
  - "element-clone"

- `send-on` with a single event:
  - "change"
  - "click"
  - "blur
  - "focus"
  - "domcontentloaded"
  - "receive" -> forward value to other element(s)

- `send`, that can be used as a replacement to all these properties at once: `send-prop`, `send-element`, `send-on`, `send-to` and `send-as`.
  - Example 1: `<input send="value|change|div" /> <div receive-as="text" ></div>` will send the input value to the div when it changes.
  - Example 2: `<div send="{p}|click|#bar" >Click Me</div> <p>Hello</p> <span id="bar" receive-as="element" ></span>` will send the paragraph to the span when the div is clicked.

- `receive-as` with:
  - "text"
  - "html"
  - "number"
  - "int"
  - "float"
  - "json"
  - "fetch-html" (html, css)
  - "fetch-html-js" (html, css, javascript)
  - "fetch-json"
  - "fetch-text"
  - "element"
  - "element-clone"

- `on-receive` with sync function

- `on-receive-error` with function

- `on-send-error` with function

- `$history` as a special target for "send-to", that adds a URL to the browser history - e.g. send-to="div,$history"

- `prevent` - to call preventDefault() on `<a>`, `<form>`, etc.


#### Notes

- `send-prop` and `send-element` must not be used together.
- When `"element-clone"` references a `<template>` tag, it will clone the template's content.

#### Limitations

- JSON content in element properties must have unquoted or single-quoted properties (HTML limitation)
  - ex.: `<span data-todo="{ title: 'Buy coffee', completed: false }" ></span>`
  - ex.: `<span data-todo="{ 'title': 'Buy coffee', 'completed': false }" ></span>`
- `$history` must be at the beginning or at the end of "send-to"


## License

[MIT](/LICENSE) © [Thiago Delgado Pinto](https://github.com/thiagodp)
