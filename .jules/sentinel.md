## 2024-05-02 - XSS via Alt Attribute
**Vulnerability:** XSS vulnerability through the `alt` attribute of image attachments.
**Learning:** `escapeHtml` functions in vanilla JavaScript often only escape `<`, `>`, and `&`. When injecting user input into HTML attributes (like `alt` or `title`), the input must also be escaped for double (`"`) and single (`'`) quotes.
**Prevention:** Always use a specific `escapeAttribute` function that replaces quotes when injecting dynamic values into standard HTML attributes.
