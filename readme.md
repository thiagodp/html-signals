# html-signals

> Increase HTML properties to reduce the need of writing JavaScript code

👉 **Work-In-Progress! API is not stable yet and things may change.**

📝 Documentation to appear - see [tests](/test/index.spec.ts) or [examples](/examples/) for now.


## Already supported

- `send-what` with a single property
- `send-to` with query selector
- `send-as` with:
  - "text"
  - "html"
  - "json" - with unquoted properties only (HTML limitation)
  - "fetch-html"
  - "fetch-json"
  - "fetch-text"
  - "element"
  - "element-clone"
- `receive-as` with:
  - "text"
  - "html"
  - "fetch-html"
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

## Notes

- `send-what` and `send-element` must not be used together.
- When `"element-clone"` references a `<template>` tag, it will clone the template's content.

## Limitations

- JSON content in element properties must have unquoted or single-quoted properties (HTML limitation)
  - ex.: `<span data-todo="{ title: 'Buy coffee', completed: false }" ></span>`
  - ex.: `<span data-todo="{ 'title': 'Buy coffee', 'completed': false }" ></span>`
- `$history` must be at the beginning or at the end of "send-to"

## License

[MIT](/LICENSE) (c) by [Thiago Delgado Pinto](https://github.com/thiagodp)
