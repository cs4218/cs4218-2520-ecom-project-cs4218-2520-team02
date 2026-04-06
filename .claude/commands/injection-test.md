Run the input sanitisation and injection security test suite against the live application.

## Prerequisites

Start the Virtual Vault server first:
```
npm run server
```
App must be reachable at http://localhost:6060 (or set APP_URL env var).

## Run

```
npm run test:injection
```

No ZAP required — this suite sends crafted HTTP payloads directly (Postman-equivalent).

## What is tested (18 checks across 5 groups)

| Group | Checks |
|---|---|
| NoSQL Injection — Auth | $gt email bypass, $ne password bypass, $where login, operator in register, operator in forgot-password |
| NoSQL Injection — Product Filters | $where in checked, $gt match-all, non-numeric radio, nested operators, error disclosure via `error` key |
| Regex Injection — Search | Match-all regex bypass, ReDoS payload timeout, whitespace keyword handling |
| Schema Validation | Array email, numeric email, array password, string for checked field |
| Error Disclosure | Login malformed body, register all-operator fields, forgot-password malformed body |

## Endpoints covered

- POST /api/v1/auth/login
- POST /api/v1/auth/register
- POST /api/v1/auth/forgot-password
- POST /api/v1/product/product-filters
- GET  /api/v1/product/search/:keyword

## Acceptance criteria

- No endpoint executes or reflects injected operator payloads
- No endpoint returns HTTP 500 for any injected input
- No endpoint returns auth token for operator-payload login/register
- productFiltersController does not expose `error` key in 400 response
- Search keyword escaping prevents match-all regex and ReDoS

## Known pre-existing issue to watch for

`productFiltersController` (productController.js) has `error,` in its catch
block — will cause the error disclosure test to fail until removed. Fix:
  ```js
  res.status(400).send({ success: false, message: "Error While Filtering Products" });
  ```

$ARGUMENTS
