Run the OWASP ZAP dynamic security scan against the live authentication endpoints.

## Prerequisites (both must be running)

1. Start the Virtual Vault server:
   ```
   npm run server
   ```
   Server must be reachable at http://localhost:6060

2. Start OWASP ZAP in daemon mode:
   ```
   zap.sh -daemon -port 8080 -config api.key=zapkey
   ```
   Or via Docker (no local ZAP install needed):
   ```
   docker run -u zap -p 8080:8080 zaproxy/zap-stable \
     zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.key=zapkey
   ```

## Run the scan

```
npm run test:dast
```

Scans run in this order: Spider (passive) → Active Scan (attack payloads)
Expect ~2–5 minutes depending on machine speed.

## What is tested

| Test | Criteria |
|---|---|
| HIGH severity alerts | Must be 0 |
| SQL Injection on login/register | Must be 0 |
| Command Injection | Must be 0 |
| Sensitive info in error responses | Must be 0 |
| Stack trace / path leakage | Must be 0 |
| Missing security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) | Must be 0 |
| Verbose Server header | Must be 0 |
| 500 errors under brute-force simulation | Must be 0 |
| XSS via registration fields (HIGH/MEDIUM) | Must be 0 |
| MEDIUM severity alert count | Must be ≤ 5 |

## Endpoints scanned

- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/forgot-password

## Custom ZAP / app URLs

Override defaults with environment variables:
```
APP_URL=http://localhost:6060 ZAP_URL=http://localhost:8080 ZAP_API_KEY=zapkey npm run test:dast
```

## After the scan

1. Review the Alert Summary output in the Jest console
2. For each finding: remediate the source code or document an accepted risk
3. Re-run to confirm fixes: `npm run test:dast`
4. For full HTML report from ZAP:
   ```
   zap-cli report -o zap-report.html -f html
   ```

$ARGUMENTS
