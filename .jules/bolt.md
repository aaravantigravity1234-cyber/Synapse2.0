## 2024-05-18 - Prevent Layout Thrashing in Event Handlers
**Learning:** High-frequency event handlers (`scroll`, `resize`) that read layout-triggering properties (e.g., `window.scrollY`, `window.innerHeight`, `scrollHeight`) can cause layout thrashing and block the main thread.
**Action:** Always wrap these property reads and their subsequent DOM manipulations inside a `window.requestAnimationFrame()` callback using a ticking flag (`isScrolling`, `isResizing`) to throttle execution to the browser's render cycle.
