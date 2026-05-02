## 2024-05-02 - Use requestAnimationFrame for scroll events
**Learning:** High-frequency event handlers reading layout properties (`scrollY`, `scrollHeight`, `innerHeight`) cause main thread blocking and layout thrashing in this codebase.
**Action:** Always wrap `scroll` and other layout-triggering event callbacks in a `window.requestAnimationFrame` with a ticking flag to prevent jank.