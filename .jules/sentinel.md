## 2024-05-10 - XSS in Inline Event Handlers

**Vulnerability:** XSS vulnerability in `frontend/js/chat.js` due to dynamic variables injected into inline `onclick` handlers, specifically in the `showModelWarning` function, even if escaped, as browsers decode HTML entities before JS execution.
**Learning:** Browsers decode HTML entities in inline event handlers (like `onclick="..."`) before executing the JavaScript. This means even if a dynamic variable is safely escaped with `escapeAttribute`, the browser will decode it, rendering the protection ineffective.
**Prevention:** Avoid injecting dynamic variables directly into inline JavaScript event handlers. Instead, use standard event listeners (`addEventListener`) and attach dynamic values to DOM elements using `dataset` attributes.
