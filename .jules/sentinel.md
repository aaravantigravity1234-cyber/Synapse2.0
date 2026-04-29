# Sentinel Security Journal

## [2026-04-29] Fix: IP Spoofing in Rate Limiter

### Vulnerability: IP Spoofing via `X-Forwarded-For`
The Express backend was using `req.ip` for rate limiting without configuring `trust proxy`. By default, Express does not trust the `X-Forwarded-For` header. However, if the application is deployed behind a reverse proxy (like Nginx, a load balancer, or a CDN), `req.ip` might return the internal IP of the proxy instead of the real client IP.

More importantly, if `trust proxy` is NOT set, but the rate limiter somehow relied on custom logic to read headers, or if the environment's `req.ip` was otherwise misconfigured, it could lead to:
1. **Rate Limit Evasion:** An attacker could provide a fake `X-Forwarded-For` header with varying IP addresses to bypass rate limits.
2. **Shared Rate Limits:** All users appearing to come from the same proxy IP might share the same rate limit bucket, leading to Denial of Service for legitimate users.

### Fix: Enable `trust proxy`
I added `app.set('trust proxy', 1)` to `backend/server.js`. This tells Express to trust the first hop of the proxy chain and correctly populate `req.ip` from the `X-Forwarded-For` header provided by the trusted proxy.

### Security Learning
Always ensure that the application environment (especially regarding proxies) is reflected in the Express configuration. Failing to trust the proxy correctly makes `req.ip` unreliable for security-critical features like rate limiting and audit logging.
