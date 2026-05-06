## 2026-05-06 - Missing Proxy Trust and Security Headers
**Vulnerability:** Express app lacked `app.set("trust proxy", 1)`, allowing IP spoofing for rate limits. It also had open CORS (`app.use(cors())`) and missed critical security headers.
**Learning:** Default Express configs leave apps vulnerable to proxy IP spoofing and lack defense-in-depth headers. Missing CORS restrictions allow any origin to make requests.
**Prevention:** Always set `trust proxy` when behind a reverse proxy to correctly identify client IPs. Restrict CORS origins explicitly and implement security headers middleware (or use Helmet) to enforce security defaults.
