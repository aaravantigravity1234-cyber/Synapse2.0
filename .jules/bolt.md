## 2026-05-11 - Throttle scroll and mousemove events
**Learning:** When throttling high-frequency events like `mousemove`, tracking coordinates outside the `requestAnimationFrame` callback ensures the final position isn't dropped during rapid bursts. Conversely, for `scroll` events reading layout-triggering properties (like `scrollHeight` or `scrollY`), these reads must happen *inside* the `requestAnimationFrame` callback to prevent synchronous layout thrashing.
**Action:** Always capture input coordinates outside the `rAF` closure and read layout properties inside the `rAF` closure.
