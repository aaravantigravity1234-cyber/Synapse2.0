## 2024-05-01 - [XSS] Quote escaping gap and inline event handler vulnerability
**Vulnerability:** XSS vulnerability through HTML attribute injection via unescaped quotes (`"` or `'`), as well as executing dynamic interpolated Javascript strings in `onclick` event handlers.
**Learning:** `escapeHtml` only escapes `<`, `>`, and `&`, leaving attributes vulnerable to injection, and injecting variables directly into `onclick` handlers remains an XSS vector due to HTML entity decoding.
**Prevention:** Introduce `escapeAttribute` for attribute values and avoid inline `onclick` handlers completely, preferring proper DOM event attachments via `addEventListener`.
