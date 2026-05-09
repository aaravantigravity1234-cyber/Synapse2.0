## 2024-06-25 - Throttle scroll events with layout reads
**Learning:** High-frequency frontend event handlers (like 'scroll', 'resize', or 'mousemove') that read layout-triggering properties (e.g., `scrollHeight`, `scrollY`, `innerHeight`) block the main thread and cause layout thrashing if not throttled.
**Action:** Always wrap these reads in a `window.requestAnimationFrame()` callback with a ticking flag. For coordinate tracking (like `mousemove`), remember to update the coordinate variables outside the `rAF` block to not drop final coordinates during bursts.
