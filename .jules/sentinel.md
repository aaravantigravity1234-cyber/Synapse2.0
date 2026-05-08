## 2025-05-08 - [XSS in Inline Event Handlers]
**Vulnerability:** XSS via dynamic values injected into inline event handlers (e.g., `onclick="..."`) and attributes without proper quote escaping. `escapeHtml` using DOM `textContent` does not escape quotes.
**Learning:** Browsers decode HTML entities in attributes before JavaScript execution. Escaping HTML entities in inline JS event handlers is ineffective.
**Prevention:** Avoid inline JavaScript event handlers (`onclick`). Attach dynamic values to DOM elements using `dataset` attributes (e.g., `data-id="..."`) with a dedicated `escapeAttribute` function (escaping `"`, `'`, `<`, `>`, `&`), and handle them using standard standard `addEventListener`.
