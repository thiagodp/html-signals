# html-signals

> HTML properties to reduce the need of writing JavaScript code

👉 **Work-In-Progress! API is not stable yet and things may change.**

## Documentation

📝 **Documentation to be improved** - see [tests](/test/index.spec.ts) or [examples](/examples/) for now.

### Usage

⌛ *Soon*

### Methods

- `register( root?: HTMLElement, options?: Options ): void` where:
  - `root` is the root element to query elements. By default it is `document.body`.
  - `options` is an object with:
    - `sanitizer?: ( html: string ) => string` sanitizer function to use for HTML values.

- `unregister(): void` unregister all listeners and cancel all ongoing fetch events.


### Properties for HTML elements

- `send-prop` with a single property (changed from `send-what` after version `0.8.0`)
- `send-element` with a single element
- `send-to` with query selector
- `send-as` with:
  - "text"
  - "html"
  - "json" - with unquoted or single-quoted properties only (HTML limitation)
  - "fetch-html" (html, css)
  - "fetch-html-js" (html, css, javascript)
  - "fetch-json"
  - "fetch-text"
  - "element"
  - "element-clone"
- `receive-as` with:
  - "text"
  - "html"
  - "json"
  - "fetch-html" (html, css)
  - "fetch-html-js" (html, css, javascript)
  - "fetch-json"
  - "fetch-text"
  - "element"
  - "element-clone"
- `send-on` with single event:
  - "change"
  - "click"
  - "blur
  - "focus"
  - "domcontentloaded"
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
