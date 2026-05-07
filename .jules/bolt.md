## 2026-05-07 - Throttling Scroll Event Listeners with requestAnimationFrame
**Learning:** High-frequency frontend event handlers (like 'scroll', 'resize', or 'mousemove') that read layout-triggering properties (e.g., `scrollHeight`, `scrollY`, `innerHeight`) can cause layout thrashing and main thread blocking, severely impacting UI performance.
**Action:** Always wrap the layout-triggering property reads and subsequent logic in a `window.requestAnimationFrame()` callback controlled by a ticking flag to batch DOM reads/writes and prevent frame drops.
