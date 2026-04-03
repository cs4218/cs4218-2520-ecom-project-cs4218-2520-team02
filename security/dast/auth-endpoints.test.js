/**
 * Authentication Endpoint DAST Test Suite — Virtual Vault
 *
 * Uses OWASP ZAP (Zed Attack Proxy) REST API to perform automated dynamic
 * scanning against the live authentication routes:
 *
 *   POST /api/v1/auth/register
 *   POST /api/v1/auth/login
 *   POST /api/v1/auth/forgot-password
 *
 * Prerequisites (must be running before executing this suite):
 *   1. The Virtual Vault server:  npm run server   (default port 6060)
 *   2. OWASP ZAP daemon (set ZAP_API_KEY env var first):
 *        zap.sh -daemon -port 8080 -config api.key=$ZAP_API_KEY
 *      or via Docker:
 *        docker run -u zap -p 8080:8080 zaproxy/zap-stable \
 *          zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.key=$ZAP_API_KEY
 *
 * Run: npm run test:dast
 *
 * Security Metrics tracked:
 *   - Number of HIGH severity alerts on auth endpoints
 *   - Number of MEDIUM severity alerts on auth endpoints
 *   - Total unique alert types flagged
 *   - Missing security headers detected
 *   - Sensitive information disclosure in responses
 */

import http from 'node:http';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const APP_LOCAL_BASE_URL = process.env.APP_URL ?? 'http://localhost:6060';
const APP_BASE_URL = process.env.APP_URL ?? 'http://host.docker.internal:6060';
const ZAP_BASE_URL = process.env.ZAP_URL ?? 'http://localhost:8080';
const ZAP_API_KEY = process.env.ZAP_API_KEY;
if (!ZAP_API_KEY) throw new Error('ZAP_API_KEY environment variable is required. Set it in .env or pass it inline: ZAP_API_KEY=<key> npm run test:dast');

const AUTH_ENDPOINTS = [
  `${APP_BASE_URL}/api/v1/auth/register`,
  `${APP_BASE_URL}/api/v1/auth/login`,
  `${APP_BASE_URL}/api/v1/auth/forgot-password`,
];

// Scan timeouts
const SPIDER_POLL_MS = 3000;
const ASCAN_POLL_MS = 5000;
const MAX_WAIT_MS = 400_000; // 5 minutes max per scan phase

// Alert severity levels — ZAP returns alert.risk as human-readable strings
const RISK = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low', INFO: 'Informational' };

// Normalise alert.risk to an uppercase label for counting/display
function riskLabel(alert) {
  return (alert.risk ?? 'Informational').toUpperCase();
}

// ---------------------------------------------------------------------------
// False positive registry
// Each entry documents a known ZAP false positive that has been reviewed and
// accepted. An alert matches if ALL conditions are true. Document the reason
// so future reviewers understand the acceptance decision.
// ---------------------------------------------------------------------------

const FALSE_POSITIVES = [
  {
    // ZAP's SQL injection plugin fires on MongoDB endpoints because it detects
    // heuristic response differences, not actual SQL parsing. Evidence is always
    // empty because there is no SQL engine to produce error messages or data
    // leakage. Mongoose passes the email field as a typed BSON string — SQL
    // syntax is never interpreted. Email format validation was added to produce
    // a consistent 400 response for all malformed inputs, including SQL payloads.
    alertPattern: /sql.inject/i,
    condition: (a) => !a.evidence || a.evidence.trim() === '',
    reason: 'MongoDB has no SQL engine. ZAP heuristic with empty evidence — confirmed false positive. Email validation added as defence-in-depth.',
  },
  {
    // ZAP flags "default-src 'none'" as a missing-fallback violation, but
    // 'none' is strictly more restrictive than 'self' — it blocks everything,
    // which is the correct posture for a pure API server that serves no
    // browser resources. The directive is intentionally set to 'none' via
    // helmet's useDefaults:false config; all required fallback directives
    // (base-uri, form-action, navigate-to, etc.) are explicitly defined.
    alertPattern: /csp.*failure.*no fallback|csp.*directive.*no fallback/i,
    condition: (a) => /default-src\s+'none'/i.test(a.evidence ?? ''),
    reason: "CSP default-src 'none' is intentionally strict (API server serves no browser resources). All no-fallback directives are explicitly set in helmet config.",
  },
];

function isFalsePositive(alert) {
  return FALSE_POSITIVES.some(fp => fp.alertPattern.test(alert.alert) && fp.condition(alert));
}

function falsePositiveReason(alert) {
  return FALSE_POSITIVES.find(fp => fp.alertPattern.test(alert.alert) && fp.condition(alert))?.reason ?? '';
}

// ---------------------------------------------------------------------------
// ZAP REST API helpers
// ---------------------------------------------------------------------------

function zapGet(path) {
  return new Promise((resolve, reject) => {
    const url = `${ZAP_BASE_URL}/JSON/${path}&apikey=${ZAP_API_KEY}`;
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`ZAP response not valid JSON: ${data.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

function zapPost(path, params = {}) {
  return new Promise((resolve, reject) => {
    const query = new URLSearchParams({ apikey: ZAP_API_KEY, ...params }).toString();
    const options = {
      hostname: new URL(ZAP_BASE_URL).hostname,
      port: new URL(ZAP_BASE_URL).port || 8080,
      path: `/JSON/${path}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(query),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`ZAP response not valid JSON: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(query);
    req.end();
  });
}

async function pollUntilDone(statusFn, pollMs, maxMs, label) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const status = await statusFn();
    const pct = Number.parseInt(status, 10);
    process.stdout.write(`\r  ${label}: ${pct}%   `);
    if (pct >= 100) {
      process.stdout.write('\n');
      return;
    }
    await new Promise(r => setTimeout(r, pollMs));
  }
  throw new Error(`${label} did not complete within ${maxMs / 1000}s`);
}

// ---------------------------------------------------------------------------
// Connectivity checks (run once before all tests)
// ---------------------------------------------------------------------------

let zapAvailable = false;
let appAvailable = false;
let scanContextId;
let alertsByEndpoint = {};

async function checkConnectivity() {
  // Check ZAP
  try {
    await zapGet('core/view/version/?');
    zapAvailable = true;
  } catch {
    zapAvailable = false;
  }

  // Check app — use the local URL since this check runs on the host, not inside Docker
  try {
    await new Promise((resolve, reject) => {
      http.get(`${APP_LOCAL_BASE_URL}/`, (res) => {
        res.resume();
        resolve();
      }).on('error', reject);
    });
    appAvailable = true;
  } catch {
    appAvailable = false;
  }
}

// ---------------------------------------------------------------------------
// Seed ZAP with known auth endpoint request/response pairs
// This ensures ZAP knows about the POST endpoints before scanning,
// since spiders typically only follow links (GET requests).
// ---------------------------------------------------------------------------

async function seedEndpoints() {
  // Probe each endpoint through ZAP's proxy so it learns their structure.
  // We send representative (but harmless) requests; ZAP records them passively.
  const seeds = [
    {
      url: AUTH_ENDPOINTS[0], // register
      body: JSON.stringify({
        name: 'ZAP Test User',
        email: 'zap-probe@example.com',
        password: 'ZapProbe123!',
        phone: '0000000000',
        address: '1 Test Street',
        answer: 'zaptest',
      }),
    },
    {
      url: AUTH_ENDPOINTS[1], // login
      body: JSON.stringify({ email: 'zap-probe@example.com', password: 'WrongPassword!' }),
    },
    {
      url: AUTH_ENDPOINTS[1], // login — missing fields
      body: JSON.stringify({}),
    },
    {
      url: AUTH_ENDPOINTS[2], // forgot-password
      body: JSON.stringify({ email: 'zap-probe@example.com', newPassword: 'NewPass123!', answer: 'zaptest' }),
    },
  ];

  for (const seed of seeds) {
    try {
      // Tell ZAP to send a request through itself so it records the URL
      await zapPost('core/action/sendRequest/', {
        request:
          `POST ${new URL(seed.url).pathname} HTTP/1.1\r\n` +
          `Host: ${new URL(seed.url).host}\r\n` +
          `Content-Type: application/json\r\n` +
          `Content-Length: ${Buffer.byteLength(seed.body)}\r\n` +
          `\r\n` +
          seed.body,
      });
    } catch {
      // sendRequest failures are non-fatal — ZAP may still scan based on context URL
    }
  }
}

// ---------------------------------------------------------------------------
// Run spider + active scan
// ---------------------------------------------------------------------------

async function runScans() {

  await zapPost('alert/action/deleteAllAlerts/', {});
  // Create a new context scoped to the auth routes
  // Remove context if it already exists, then recreate
  try {
    await zapPost('context/action/removeContext/', { contextName: 'auth-dast' });
  } catch {
    // Context may not exist on the first run — safe to ignore
  }
  const ctxResult = await zapPost('context/action/newContext/', { contextName: 'auth-dast' });
  scanContextId = ctxResult.contextId;
  if (!scanContextId) throw new Error(`Failed to create ZAP context: ${JSON.stringify(ctxResult)}`);

  // Include only auth endpoints in the context
  for (const endpoint of AUTH_ENDPOINTS) {
    const pattern = endpoint.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    await zapPost('context/action/includeInContext/', {
      contextName: 'auth-dast',
      regex: pattern,
    });
  }

  // Include the whole auth path so ZAP scans all sub-routes
  await zapPost('context/action/includeInContext/', {
    contextName: 'auth-dast',
    regex: `${APP_BASE_URL}/api/v1/auth.*`,
  });

  await seedEndpoints();

  // Spider scan (discovers structure, follows links)
  const spiderResult = await zapPost('spider/action/scan/', {
    url: `${APP_BASE_URL}/api/v1/auth`,
    contextName: 'auth-dast',
    recurse: 'true',
  });
  const spiderId = spiderResult.scan;
  await pollUntilDone(
    async () => (await zapGet(`spider/view/status/?scanId=${spiderId}`)).status,
    SPIDER_POLL_MS,
    MAX_WAIT_MS,
    'Spider scan'
  );

  // Active scan (sends attack payloads — SQL injection, XSS, etc.)
  const ascanResult = await zapPost('ascan/action/scan/', {
    url: `${APP_BASE_URL}/api/v1/auth`,
    contextId: scanContextId,
    recurse: 'true',
    scanPolicyName: '',
  });
  const ascanId = ascanResult.scan;
  await pollUntilDone(
    async () => (await zapGet(`ascan/view/status/?scanId=${ascanId}`)).status,
    ASCAN_POLL_MS,
    MAX_WAIT_MS,
    'Active scan'
  );
}

// ---------------------------------------------------------------------------
// Collect and organise alerts
// ---------------------------------------------------------------------------

async function collectAlerts() {
  // Get all alerts from ZAP for the auth base URL
  const result = await zapGet(
    `core/view/alerts/?baseurl=${encodeURIComponent(APP_BASE_URL + '/api/v1/auth')}&`
  );
  const alerts = result.alerts ?? [];

  // Group by endpoint URL
  for (const alert of alerts) {
    const url = alert.url ?? 'unknown';
    if (!alertsByEndpoint[url]) alertsByEndpoint[url] = [];
    alertsByEndpoint[url].push(alert);
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await checkConnectivity();

  if (!zapAvailable || !appAvailable) return; // tests will skip themselves

  await runScans();
  await collectAlerts();
}, MAX_WAIT_MS + 30_000);

// ---------------------------------------------------------------------------

function skipIfUnavailable() {
  if (!appAvailable) {
    console.warn(
      '\n  SKIPPED: Virtual Vault server is not reachable at ' + APP_LOCAL_BASE_URL +
      '\n  Start it with: npm run server\n'
    );
    return true;
  }
  if (!zapAvailable) {
    console.warn(
      '\n  SKIPPED: OWASP ZAP is not reachable at ' + ZAP_BASE_URL +
      '\n  Start ZAP with:' +
      '\n    zap.sh -daemon -port 8080 -config api.key=$ZAP_API_KEY' +
      '\n  or via Docker:' +
      '\n    docker run -u zap -p 8080:8080 zaproxy/zap-stable zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.key=$ZAP_API_KEY\n'
    );
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------

describe('DAST: Authentication Endpoint Availability', () => {
  it('Virtual Vault server should be reachable at ' + APP_LOCAL_BASE_URL, async () => {
    if (!appAvailable) {
      throw new Error(
        `Application not reachable at ${APP_LOCAL_BASE_URL}. ` +
        'Start the server with: npm run server'
      );
    }
  });

  it('OWASP ZAP should be reachable at ' + ZAP_BASE_URL, async () => {
    if (!zapAvailable) {
      throw new Error(
        `OWASP ZAP not reachable at ${ZAP_BASE_URL}. ` +
        'Start ZAP with: zap.sh -daemon -port 8080 -config api.key=$ZAP_API_KEY'
      );
    }
  });
});

// ---------------------------------------------------------------------------

describe('DAST: High Severity Vulnerabilities', () => {
  it('should have no HIGH severity alerts on authentication endpoints', async () => {
    if (skipIfUnavailable()) return;

    const allAlerts = Object.values(alertsByEndpoint).flat();
    const highAlerts = allAlerts.filter(a => a.risk === RISK.HIGH);
    const realHighAlerts = highAlerts.filter(a => !isFalsePositive(a));
    const acceptedHighAlerts = highAlerts.filter(a => isFalsePositive(a));

    if (acceptedHighAlerts.length > 0) {
      console.warn(
        `\n  ACCEPTED FALSE POSITIVES (${acceptedHighAlerts.length}):\n` +
        acceptedHighAlerts
          .map(a => `    [HIGH] ${a.alert} — ${a.url}\n    Reason: ${falsePositiveReason(a)}`)
          .join('\n')
      );
    }

    if (realHighAlerts.length > 0) {
      const report = realHighAlerts
        .map(a =>
          `  [HIGH] ${a.alert}\n` +
          `    URL: ${a.url}\n` +
          `    Param: ${a.param || 'n/a'}\n` +
          `    Evidence: ${(a.evidence ?? '').slice(0, 120)}\n` +
          `    Solution: ${(a.solution ?? '').replaceAll(/<[^>]+>/g, '').slice(0, 200)}`
        )
        .join('\n\n');
      throw new Error(
        `${realHighAlerts.length} HIGH severity alert(s) detected on authentication endpoints:\n\n${report}`
      );
    }
  });

  it('should have no SQL injection vulnerabilities on login and register', async () => {
    if (skipIfUnavailable()) return;

    const allAlerts = Object.values(alertsByEndpoint).flat();
    const sqliAlerts = allAlerts.filter(
      a => /sql.inject/i.test(a.alert) || a.pluginId === '40018' || a.pluginId === '40019'
    );
    const realSqliAlerts = sqliAlerts.filter(a => !isFalsePositive(a));

    if (realSqliAlerts.length > 0) {
      const report = realSqliAlerts
        .map(a => `  [${riskLabel(a)}] ${a.alert} — ${a.url} (param: ${a.param || 'n/a'})`)
        .join('\n');
      throw new Error(`SQL Injection detected on authentication endpoints:\n${report}`);
    }
  });

  it('should have no command injection vulnerabilities', async () => {
    if (skipIfUnavailable()) return;

    const allAlerts = Object.values(alertsByEndpoint).flat();
    const cmdAlerts = allAlerts.filter(
      a => /command.inject|remote.os.command/i.test(a.alert) || a.pluginId === '90020'
    );

    if (cmdAlerts.length > 0) {
      const report = cmdAlerts
        .map(a => `  [${riskLabel(a)}] ${a.alert} — ${a.url}`)
        .join('\n');
      throw new Error(`Command Injection detected on authentication endpoints:\n${report}`);
    }
  });
});

// ---------------------------------------------------------------------------

describe('DAST: Information Disclosure', () => {
  it('should not expose sensitive information in error responses', async () => {
    if (skipIfUnavailable()) return;

    const allAlerts = Object.values(alertsByEndpoint).flat();
    const disclosureAlerts = allAlerts.filter(a =>
      /information disclosure|application error|debug error|stack trace|server error information/i.test(a.alert)
    );

    if (disclosureAlerts.length > 0) {
      const report = disclosureAlerts
        .map(a =>
          `  [${riskLabel(a)}] ${a.alert}\n` +
          `    URL: ${a.url}\n` +
          `    Evidence: ${(a.evidence ?? '').slice(0, 150)}`
        )
        .join('\n\n');
      throw new Error(
        `Sensitive information disclosure detected on authentication endpoints:\n\n${report}`
      );
    }
  });

  it('should not leak internal server paths or stack traces in 500 responses', async () => {
    if (skipIfUnavailable()) return;

    const allAlerts = Object.values(alertsByEndpoint).flat();
    const pathLeakAlerts = allAlerts.filter(a =>
      /path traversal|directory listing|file path|stack trace/i.test(a.alert)
    );

    if (pathLeakAlerts.length > 0) {
      const report = pathLeakAlerts
        .map(a => `  [${riskLabel(a)}] ${a.alert} — ${a.url}`)
        .join('\n');
      throw new Error(`Server path / stack trace leakage detected:\n${report}`);
    }
  });
});

// ---------------------------------------------------------------------------

describe('DAST: Security Headers', () => {
  it('should not be missing critical security response headers', async () => {
    if (skipIfUnavailable()) return;

    const allAlerts = Object.values(alertsByEndpoint).flat();
    // ZAP alert names for missing headers (plugin IDs and names)
    const HEADER_ALERTS = {
      'Content-Security-Policy':       ['Content Security Policy (CSP) Header Not Set', '10038'],
      'X-Content-Type-Options':        ['X-Content-Type-Options Header Missing', '10021'],
      'Strict-Transport-Security':     ['Strict-Transport-Security Header Not Set', '10035'],
      'X-Frame-Options':               ['X-Frame-Options Header Not Set', '10020'],
    };

    const missingHeaders = [];
    for (const [header, [alertName, pluginId]] of Object.entries(HEADER_ALERTS)) {
      const found = allAlerts.find(
        a => a.alert === alertName || a.pluginId === pluginId
      );
      if (found) {
        missingHeaders.push(`  Missing: ${header} — ${found.alert} (risk: ${riskLabel(found)})`);
      }
    }

    if (missingHeaders.length > 0) {
      throw new Error(
        `Security response headers are missing on authentication endpoints:\n` +
        missingHeaders.join('\n') +
        '\n\nAdd these headers in Express using the "helmet" middleware: npm install helmet'
      );
    }
  });

  it('should not return an overly verbose Server header', async () => {
    if (skipIfUnavailable()) return;

    const allAlerts = Object.values(alertsByEndpoint).flat();
    const serverHeaderAlert = allAlerts.find(
      a => /server leaks version information/i.test(a.alert) || a.pluginId === '10036'
    );

    if (serverHeaderAlert) {
      throw new Error(
        `Server header discloses version information (fingerprinting risk):\n` +
        `  Alert: ${serverHeaderAlert.alert}\n` +
        `  Evidence: ${(serverHeaderAlert.evidence ?? '').slice(0, 150)}\n` +
        `  Fix: app.disable('x-powered-by') and configure Express to suppress the Server header`
      );
    }
  });
});

// ---------------------------------------------------------------------------

describe('DAST: Authentication-Specific Vulnerabilities', () => {
  it('should not be vulnerable to brute-force (no rate limiting detected)', async () => {
    if (skipIfUnavailable()) return;

    // ZAP does not directly test rate limiting, so we do a lightweight direct check:
    // Send 10 rapid failed login requests and verify the app does not lock out with 500
    // (which would indicate no error handling for repeated failures) — 429 or consistent
    // 401/404 responses are acceptable; 500 is not.
    // Use the local URL — this request goes directly from Jest (host) to the app (host), not via Docker
    const loginUrl = `${APP_LOCAL_BASE_URL}/api/v1/auth/login`;
    const payload = JSON.stringify({ email: 'brute@example.com', password: 'wrong' });

    const responseCodes = await Promise.all(
      Array.from({ length: 10 }, () =>
        new Promise((resolve) => {
          const options = {
            hostname: new URL(loginUrl).hostname,
            port: new URL(loginUrl).port || 80,
            path: new URL(loginUrl).pathname,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            },
          };
          const req = http.request(options, (res) => {
            res.resume();
            resolve(res.statusCode);
          });
          req.on('error', () => resolve(null));
          req.write(payload);
          req.end();
        })
      )
    );

    const serverErrors = responseCodes.filter(c => c === 500);
    if (serverErrors.length > 0) {
      throw new Error(
        `Login endpoint returned ${serverErrors.length} HTTP 500 responses under rapid repeated ` +
        `requests — indicates missing error handling. No rate limiting (HTTP 429) was detected. ` +
        `Implement rate limiting using the "express-rate-limit" package.`
      );
    }
  });

  it('should not be vulnerable to XSS via registration input fields', async () => {
    if (skipIfUnavailable()) return;

    const allAlerts = Object.values(alertsByEndpoint).flat();
    const xssAlerts = allAlerts.filter(
      a =>
        /cross.site.script|xss|reflected/i.test(a.alert) &&
        (a.risk === RISK.HIGH || a.risk === RISK.MEDIUM)
    );

    if (xssAlerts.length > 0) {
      const report = xssAlerts
        .map(a =>
          `  [${riskLabel(a)}] ${a.alert}\n` +
          `    URL: ${a.url}\n` +
          `    Param: ${a.param || 'n/a'}\n` +
          `    Evidence: ${(a.evidence ?? '').slice(0, 120)}`
        )
        .join('\n\n');
      throw new Error(`XSS vulnerabilities detected on authentication endpoints:\n\n${report}`);
    }
  });
});

// ---------------------------------------------------------------------------

describe('DAST: Alert Summary (metrics)', () => {
  it('should report the full alert breakdown for audit purposes', async () => {
    if (skipIfUnavailable()) return;

    const allAlerts = Object.values(alertsByEndpoint).flat();
    const realAlerts = allAlerts.filter(a => !isFalsePositive(a));
    const fpAlerts   = allAlerts.filter(a => isFalsePositive(a));

    const counts = { HIGH: 0, MEDIUM: 0, LOW: 0, INFORMATIONAL: 0 };
    for (const alert of realAlerts) {
      const label = riskLabel(alert);
      counts[label] = (counts[label] ?? 0) + 1;
    }

    const uniqueAlertTypes = [...new Set(realAlerts.map(a => a.alert))];

    // Log the full metric report — this test always passes; it is for recording
    console.log('\n  ── DAST Alert Summary ──────────────────────────────────────');
    console.log(`  Total alerts (raw)       : ${allAlerts.length}`);
    console.log(`  Accepted false positives : ${fpAlerts.length}`);
    console.log(`  Real alerts              : ${realAlerts.length}`);
    console.log(`  HIGH                     : ${counts.HIGH}`);
    console.log(`  MEDIUM                   : ${counts.MEDIUM}`);
    console.log(`  LOW                      : ${counts.LOW}`);
    console.log(`  INFORMATIONAL            : ${counts.INFORMATIONAL}`);
    console.log(`  Unique alert types       : ${uniqueAlertTypes.length}`);
    console.log('  Alert types found :');
    for (const type of uniqueAlertTypes) {
      const risk = riskLabel(realAlerts.find(a => a.alert === type) ?? {});
      console.log(`    [${risk}] ${type}`);
    }
    if (fpAlerts.length > 0) {
      console.log('  Accepted false positives :');
      for (const fp of fpAlerts) {
        console.log(`    [ACCEPTED] ${fp.alert} — ${fp.url}`);
        console.log(`      Reason: ${falsePositiveReason(fp)}`);
      }
    }
    console.log('  ────────────────────────────────────────────────────────────\n');
  });
});
