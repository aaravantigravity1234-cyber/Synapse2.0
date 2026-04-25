## 2026-04-25 - XSS in Markdown Parser
**Vulnerability:** Cross-Site Scripting (XSS) via unescaped quotes in markdown URL/alt parser.
**Learning:** Native `escapeHtml` implementation in `frontend/js/chat.js` (using textContent to innerHTML) escapes `<`, `>`, and `&`, but does NOT escape quotes (`"` or `'`). Explicit attribute escaping (e.g., an `escapeAttribute` helper) must be used when injecting dynamic values into HTML attributes to prevent XSS. Also URLs must be sanitized (e.g. against javascript: protocols).
**Prevention:** Always use dedicated HTML entity escapers and sanitize URLs strictly, especially when implementing regex-based custom markdown parsers.
