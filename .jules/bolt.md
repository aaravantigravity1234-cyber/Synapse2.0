## 2024-04-25 - In-place Array Pruning for Rate Limiters
**Learning:** The previous rate limiter implementation used `.filter()` on every request and every cleanup interval. Since rate limit maps are accessed at high frequency, `.filter()` causes unnecessary array allocation on every hit, leading to high Garbage Collection (GC) pressure.
**Action:** Always use an in-place `while` loop with `.shift()` to prune expired timestamps in sliding-window rate limiters. This avoids allocating a new array and leverages the fact that timestamps are naturally sorted chronologically.
