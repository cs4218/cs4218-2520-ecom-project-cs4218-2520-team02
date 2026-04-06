Run the static-analysis security test suite for the Virtual Vault codebase.

## What this tests
1. **Hardcoded secrets** — scans all source files (controllers, models, middlewares, helpers, routes, client/src) for JWT secrets, MongoDB credentials, Braintree keys, passwords, and API tokens hardcoded as string literals instead of read from process.env
2. **Git-tracked sensitive files** — checks whether .env, private keys, or certificates are committed to the repository
3. **Vulnerable code patterns** — flags eval(), unsafe innerHTML assignments, dangerouslySetInnerHTML, command injection via child_process.exec, and stack traces exposed in API responses
4. **Dependency vulnerabilities** — runs npm audit and fails on critical or high severity CVEs

## Performance metrics tracked
- Number of critical/high severity issues detected
- Number of hardcoded secrets or exposed credentials found

## Steps
1. Run the security test suite:
   ```
   npm run test:security
   ```
2. Read the full output — each failure message names the file, line number, and rule violated
3. For each finding, either:
   - **Remediate**: move hardcoded value to .env and reference via process.env, remove the committed file, or patch the vulnerable pattern
   - **Accept risk**: add an inline comment `// security-accepted: <justification>` and note it in the project's risk register
4. Re-run until all tests pass or all findings are formally accepted
5. For deeper static analysis, also run SonarQube:
   ```
   npm run sonarqube
   ```
   Then review results at http://localhost:9000

## Criteria for passing
- No critical or high severity vulnerabilities unresolved
- No hardcoded API keys, JWT secrets, or database credentials in source files
- .env and private key files not committed to git
- All flagged code patterns remediated or formally accepted

$ARGUMENTS
