## 2026-04-26 - [XSS Fix] escapeAttribute needed for HTML attributes
**Vulnerability:** The existing `escapeHtml` function correctly handled inner HTML entities (using textContent to innerHTML conversion, catching `<`, `>`, `&`) but missed quotes (`"`, `'`). This allowed injected file names, URLs, and image tags to break out of attributes via payloads like `url="onmouseover=alert(1)"`.
**Learning:** For direct UI DOM rendering without a framework (Vanilla JS frontend), attribute values must specifically encode string literals in addition to tags.
**Prevention:** Ensure new feature integrations involving dynamic URL parameters, file names, or user tags leverage an `escapeAttribute` function to reliably encode single and double quotes.
