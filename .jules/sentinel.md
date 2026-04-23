## 2025-01-21 - Fix Information Leakage in API Errors
**Vulnerability:** The backend server exposed internal server state by returning detailed error messages regarding missing or invalid API keys, as well as the underlying API's `realError` directly to the client.
**Learning:** Returning detailed error messages and third-party API errors to the client poses an information leakage risk, as it exposes the internal configuration and authentication status to potentially malicious users.
**Prevention:** Ensure that error handlers return generic, safe messages to the client while logging detailed errors on the server side.
