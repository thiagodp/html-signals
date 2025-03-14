# html-signals

> WIP

## Already supported

- `send-what` with a single property
- `send-to` with query selector
- `send-as` with:
  - "text"
  - "html"
  - "json" - with unquoted properties only (HTML limitation)
  - "fetch-html"
  - "fetch-json"
- `receive-as` with:
  - "text"
  - "html"
  - "fetch-html"
- `send-on` with single event
- `on-receive` with sync function
- `on-receive-error` with function
- `on-send-error` with function
- `$history` as a special target for "send-to", that adds a URL to the browser history - e.g. send-to="div,$history"
- `prevent` - to call preventDefault() on `<a>`, `<form>`, etc.


## Limitations

- JSON content in element properties must have unquoted properties only (HTML limitation)
  - ex.: `<span data-todo="{ title: 'Buy coffee', completed: false }" ></span>`
- $history must be at the beginning or at the end of "send-to"
