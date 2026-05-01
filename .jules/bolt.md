## 2024-05-24 - Layout Thrashing in High-Frequency Events
**Learning:** High-frequency frontend event handlers ('scroll', 'resize', 'mousemove') reading layout-triggering properties (`scrollHeight`, `scrollY`, `innerHeight`) block the main thread and cause layout thrashing if not throttled.
**Action:** Always wrap high-frequency layout reads/writes in a `window.requestAnimationFrame()` callback with a ticking flag.
