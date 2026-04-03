/**
 * Input Sanitisation & Injection Security Test Suite — Virtual Vault
 *
 * Verifies that user-supplied input across product, auth, and profile endpoints
 * is properly sanitised and validated, preventing NoSQL injection, operator
 * injection, and regex-based attacks from compromising the MongoDB layer.
 *
 * Approach: Direct HTTP payload submission (equivalent to Postman manual
 * testing but automated). Each test sends a crafted malicious payload and
 * asserts the application rejects it safely — no database bypass, no error
 * leakage, no unintended data returned.
 *
 * Prerequisites:
 *   npm run server   (app must be running at APP_URL)
 *
 * Run: npm run test:injection
 *
 * Security Metrics tracked:
 *   - Number of endpoints accepting unsanitised malicious input
 *   - Number of injection payloads producing unintended behaviour or DB errors
 *   - Number of endpoints leaking database structure in error responses
 */

import http from 'node:http';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const APP_URL   = process.env.APP_URL ?? 'http://localhost:6060';
const APP_HOST  = new URL(APP_URL).hostname;
const APP_PORT  = Number(new URL(APP_URL).port) || 6060;
const TIMEOUT_MS = 8000; // max response time — catches ReDoS hangs

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

function post(path, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Request to ${path} timed out after ${TIMEOUT_MS}ms`)),
      TIMEOUT_MS
    );
    const req = http.request(
      {
        hostname: APP_HOST,
        port: APP_PORT,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...extraHeaders,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          clearTimeout(timer);
          let json = null;
          try { json = JSON.parse(data); } catch { /* non-JSON response */ }
          resolve({ status: res.statusCode, body: json, raw: data });
        });
      }
    );
    req.on('error', (err) => { clearTimeout(timer); reject(err); });
    req.write(payload);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Request to ${path} timed out after ${TIMEOUT_MS}ms`)),
      TIMEOUT_MS
    );
    http.get(`${APP_URL}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        clearTimeout(timer);
        let json = null;
        try { json = JSON.parse(data); } catch { /* non-JSON response */ }
        resolve({ status: res.statusCode, body: json, raw: data });
      });
    }).on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

/** Fails if the response body contains any field that looks like a DB schema
 *  detail, stack trace, or Mongoose internals. */
function assertNoSchemaLeak(res, label = '') {
  const text = (res.raw ?? '').toLowerCase();
  const leakPatterns = [
    /at\s+\w+\s+\(.*\.js:\d+/,    // stack trace line: "at Object (file.js:10)"
    /"_doc"\s*:/,                  // Mongoose internal _doc
    /mongoservererror/i,           // MongoDB error class name
    /cast to objectid/i,           // Mongoose cast error detail
    /e11000 duplicate key/i,       // MongoDB duplicate key error text
    /validators failed/i,          // Mongoose validation internals
  ];
  for (const pattern of leakPatterns) {
    if (pattern.test(text)) {
      throw new Error(
        `${label}: Response leaks database/schema internals.\n` +
        `Pattern matched: ${pattern}\n` +
        `Response body: ${res.raw.slice(0, 300)}`
      );
    }
  }
}

/** Fails if the response is HTTP 500 — indicates unhandled server error. */
function assertNo500(res, label = '') {
  if (res.status === 500) {
    throw new Error(
      `${label}: Endpoint returned HTTP 500 (unhandled error).\n` +
      `Body: ${res.raw.slice(0, 300)}`
    );
  }
}

/** Fails if the response carries a JWT token — indicates auth bypass. */
function assertNoAuthBypass(res, label = '') {
  const hasToken = res.body?.token !== undefined;
  const isSuccess = res.status === 200 && res.body?.success === true;
  if (hasToken && isSuccess) {
    throw new Error(
      `${label}: Auth bypass — server returned a JWT token for an injected payload.\n` +
      `Status: ${res.status}\nBody: ${JSON.stringify(res.body).slice(0, 300)}`
    );
  }
}

// ---------------------------------------------------------------------------
// Connectivity check
// ---------------------------------------------------------------------------

let appAvailable = false;

beforeAll(async () => {
  try {
    await get('/');
    appAvailable = true;
  } catch {
    appAvailable = false;
  }
});

function skipIfDown() {
  if (!appAvailable) {
    console.warn(
      `\n  SKIPPED: App not reachable at ${APP_URL}. Run: npm run server\n`
    );
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 1. NoSQL Operator Injection — Authentication Endpoints
// ---------------------------------------------------------------------------

describe('Injection: NoSQL Operator Injection — Auth Endpoints', () => {
  it('login should reject object-type email (NoSQL auth bypass via $gt)', async () => {
    if (skipIfDown()) return;

    // {"email": {"$gt": ""}, "password": "anything"}
    // Without mongoSanitize, findOne({ email: { $gt: "" } }) matches ANY user.
    const res = await post('/api/v1/auth/login', {
      email: { $gt: '' },
      password: 'anything',
    });

    assertNo500(res, 'login $gt email');
    assertNoAuthBypass(res, 'login $gt email');
    // Should be rejected as invalid — 400 or 404
    if (res.status === 200 && res.body?.token) {
      throw new Error('NoSQL auth bypass succeeded: login returned a token for operator payload');
    }
  });

  it('login should reject $ne password bypass', async () => {
    if (skipIfDown()) return;

    // {"email": "anyvalid@email.com", "password": {"$ne": null}}
    // $ne: null would match any non-null password hash.
    const res = await post('/api/v1/auth/login', {
      email: 'admin@virtualvault.com',
      password: { $ne: null },
    });

    assertNo500(res, 'login $ne password');
    assertNoAuthBypass(res, 'login $ne password');
  });

  it('login should reject $where JavaScript operator', async () => {
    if (skipIfDown()) return;

    const res = await post('/api/v1/auth/login', {
      email: { $where: 'function() { return true; }' },
      password: 'anything',
    });

    assertNo500(res, 'login $where');
    assertNoAuthBypass(res, 'login $where');
  });

  it('register should reject operator injection in email field', async () => {
    if (skipIfDown()) return;

    const res = await post('/api/v1/auth/register', {
      name: 'Test',
      email: { $gt: '' },
      password: 'Test1234!',
      phone: '1234567890',
      address: '1 Test St',
      answer: 'test',
    });

    assertNo500(res, 'register $gt email');
    // Must not succeed — 400 expected (invalid email format)
    if (res.status === 201) {
      throw new Error('Register accepted an operator object as email — injection not blocked');
    }
  });

  it('forgot-password should reject operator injection in email field', async () => {
    if (skipIfDown()) return;

    const res = await post('/api/v1/auth/forgot-password', {
      email: { $ne: null },
      answer: 'anything',
      newPassword: 'New1234!',
    });

    assertNo500(res, 'forgot-password $ne email');
    // Must not succeed — operator should be stripped/rejected
    if (res.status === 200 && res.body?.success === true) {
      throw new Error('Forgot-password accepted operator payload — password reset bypass succeeded');
    }
  });
});

// ---------------------------------------------------------------------------
// 2. NoSQL Operator Injection — Product Filter Endpoint
// ---------------------------------------------------------------------------

describe('Injection: NoSQL Operator Injection — Product Filters', () => {
  it('filters should reject $where operator in checked array', async () => {
    if (skipIfDown()) return;

    // Without sanitisation: { category: [{"$where": "1==1"}] } would execute JS
    const res = await post('/api/v1/product/product-filters', {
      checked: [{ $where: "function() { return true; }" }],
      radio: [],
    });

    assertNo500(res, 'filters $where in checked');
    assertNoSchemaLeak(res, 'filters $where in checked');
  });

  it('filters should reject $gt operator in checked array (match-all categories)', async () => {
    if (skipIfDown()) return;

    // { category: { $gt: "" } } would match all categories
    const res = await post('/api/v1/product/product-filters', {
      checked: { $gt: '' },
      radio: [],
    });

    assertNo500(res, 'filters $gt checked');
    assertNoSchemaLeak(res, 'filters $gt checked');
  });

  it('filters should reject non-numeric values in radio (price range)', async () => {
    if (skipIfDown()) return;

    // radio[0] and radio[1] are used as $gte/$lte — inject operator strings
    const res = await post('/api/v1/product/product-filters', {
      checked: [],
      radio: [{ $gt: '' }, { $lt: '' }],
    });

    assertNo500(res, 'filters operator radio');
    assertNoSchemaLeak(res, 'filters operator radio');
  });

  it('filters should reject deeply nested operator objects', async () => {
    if (skipIfDown()) return;

    const res = await post('/api/v1/product/product-filters', {
      checked: [],
      radio: [{ $where: 'sleep(2000)' }, 9999],
    });

    assertNo500(res, 'filters nested operator');
    assertNoSchemaLeak(res, 'filters nested operator');
  });

  it('filter error responses must not expose the error object or DB details', async () => {
    if (skipIfDown()) return;

    // Send a payload that will trigger the catch block
    const res = await post('/api/v1/product/product-filters', {
      checked: null,  // null instead of array — will cause runtime error
      radio: null,
    });

    // Should return 400 with a safe message — no raw error or schema detail
    assertNoSchemaLeak(res, 'filter error disclosure');

    const body = res.body ?? {};
    if (body.error !== undefined) {
      throw new Error(
        'productFiltersController leaks the raw error object in the response body.\n' +
        `Remove the "error" key from the catch block response in productController.js.\n` +
        `Response: ${JSON.stringify(body).slice(0, 300)}`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Regex / ReDoS Injection — Product Search
// ---------------------------------------------------------------------------

describe('Injection: Regex Injection — Product Search', () => {
  it('search should not allow match-all regex to bypass expected result scope', async () => {
    if (skipIfDown()) return;

    // ".*" as a keyword — after escaping it becomes "\\.\\*" (literal search)
    // Result should be scoped, not return every product
    const wildcardRes  = await get('/api/v1/product/search/.*');
    const specificRes  = await get('/api/v1/product/search/specificproductnamethatdoesnotexist99999');

    assertNo500(wildcardRes, 'search .*');
    assertNo500(specificRes, 'search specific');

    // If wildcard returns MORE results than a specific non-existent term,
    // the regex is being passed through unescaped — confirm escaping works.
    const wildcardCount  = wildcardRes.body?.results?.length  ?? 0;
    const specificCount  = specificRes.body?.results?.length  ?? 0;

    // Both should return 0 results since ".*" is treated as literal text
    // (escaped to "\.\ *") and no product is named ".*"
    if (wildcardCount > specificCount + 10) {
      throw new Error(
        `Search keyword ".*" returned ${wildcardCount} results while a random non-existent ` +
        `keyword returned ${specificCount}. The regex may not be fully escaped — ` +
        `verify searchProductController escapes all special characters.`
      );
    }
  });

  it('search should handle ReDoS payload without timing out', async () => {
    if (skipIfDown()) return;

    // Catastrophic backtracking payload — should complete well within TIMEOUT_MS
    // The controller escapes special chars, so this becomes a literal string search
    const start = Date.now();
    const res = await get('/api/v1/product/search/(a%2B)%2B%24'); // (a+)+$
    const elapsed = Date.now() - start;

    assertNo500(res, 'search ReDoS');

    if (elapsed > TIMEOUT_MS * 0.8) {
      throw new Error(
        `Search with ReDoS payload took ${elapsed}ms — close to timeout. ` +
        `Verify keyword escaping is preventing catastrophic backtracking.`
      );
    }
  });

  it('search should handle empty keyword gracefully (400 not 500)', async () => {
    if (skipIfDown()) return;

    const res = await get('/api/v1/product/search/%20'); // whitespace-only keyword
    assertNo500(res, 'search whitespace keyword');
    if (res.status !== 400) {
      throw new Error(
        `Expected 400 for whitespace-only search keyword, got ${res.status}. ` +
        `The controller should validate that keyword is non-empty after trimming.`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Mongoose Schema Validation — Type Coercion Attacks
// ---------------------------------------------------------------------------

describe('Injection: Mongoose Schema Validation', () => {
  it('register should reject array in email field (type coercion)', async () => {
    if (skipIfDown()) return;

    const res = await post('/api/v1/auth/register', {
      name: 'Test',
      email: ['admin@test.com', { $gt: '' }],
      password: 'Test1234!',
      phone: '1234567890',
      address: '1 Test St',
      answer: 'test',
    });

    assertNo500(res, 'register array email');
    if (res.status === 201) {
      throw new Error('Register accepted array as email field — input type not validated');
    }
  });

  it('register should reject numeric email (type confusion)', async () => {
    if (skipIfDown()) return;

    const res = await post('/api/v1/auth/register', {
      name: 'Test',
      email: 12345,
      password: 'Test1234!',
      phone: '1234567890',
      address: '1 Test St',
      answer: 'test',
    });

    assertNo500(res, 'register numeric email');
    if (res.status === 201) {
      throw new Error('Register accepted a number as email field — no format validation');
    }
  });

  it('login should reject array as password (type confusion)', async () => {
    if (skipIfDown()) return;

    const res = await post('/api/v1/auth/login', {
      email: 'test@test.com',
      password: ['anything', { $ne: null }],
    });

    assertNo500(res, 'login array password');
    assertNoAuthBypass(res, 'login array password');
  });

  it('product filters should reject string instead of array for checked', async () => {
    if (skipIfDown()) return;

    const res = await post('/api/v1/product/product-filters', {
      checked: 'DROP DATABASE',
      radio: [],
    });

    assertNo500(res, 'filters string checked');
    assertNoSchemaLeak(res, 'filters string checked');
  });
});

// ---------------------------------------------------------------------------
// 5. Error Response Information Disclosure
// ---------------------------------------------------------------------------

describe('Injection: Error Response Information Disclosure', () => {
  it('login with malformed body should not leak DB internals', async () => {
    if (skipIfDown()) return;

    const res = await post('/api/v1/auth/login', {
      email: {},
      password: {},
    });

    assertNoSchemaLeak(res, 'login malformed body');
    assertNo500(res, 'login malformed body');
  });

  it('register with all operator fields should not leak DB internals', async () => {
    if (skipIfDown()) return;

    const res = await post('/api/v1/auth/register', {
      name: { $gt: '' },
      email: { $gt: '' },
      password: { $gt: '' },
      phone: { $gt: '' },
      address: { $gt: '' },
      answer: { $gt: '' },
    });

    assertNoSchemaLeak(res, 'register all operator fields');
    assertNo500(res, 'register all operator fields');
  });

  it('forgot-password with completely malformed body should not expose internals', async () => {
    if (skipIfDown()) return;

    const res = await post('/api/v1/auth/forgot-password', {
      email: [1, 2, 3],
      answer: null,
      newPassword: { length: 100 },
    });

    assertNoSchemaLeak(res, 'forgot-password malformed body');
    assertNo500(res, 'forgot-password malformed body');
  });
});
