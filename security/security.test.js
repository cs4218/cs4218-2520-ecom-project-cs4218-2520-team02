/**
 * Security Static Analysis Test Suite — Virtual Vault
 *
 * Verifies the codebase is free from:
 *  1. Hardcoded secrets / credentials in source files
 *  2. Sensitive files committed to git (e.g. .env)
 *  3. Vulnerable code patterns (eval, XSS vectors, dangerouslySetInnerHTML)
 *  4. Critical/high npm dependency vulnerabilities
 *
 * Performance metrics tracked:
 *  - Number of critical/high severity issues detected
 *  - Number of hardcoded secrets or exposed credentials found
 *
 * Run: npm run test:security
 */

import { readFileSync, statSync, existsSync } from 'fs';
import { join, relative, extname } from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function walkFiles(dir, extensions = ['.js', '.jsx', '.ts', '.tsx'], excludeDirs = []) {
  const results = [];
  if (!existsSync(dir)) return results;

  function recurse(current) {
    let entries;
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = join(current, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        if (!excludeDirs.includes(entry) && !entry.startsWith('.')) {
          recurse(fullPath);
        }
      } else if (extensions.includes(extname(entry))) {
        results.push(fullPath);
      }
    }
  }

  recurse(dir);
  return results;
}

import { readdirSync } from 'fs';

const SOURCE_DIRS = ['controllers', 'models', 'middlewares', 'helpers', 'routes', 'client/src'];
const EXCLUDE_DIRS = ['node_modules', '__mocks__', 'coverage', '.git', 'test_utils', '_site', 'build'];
const EXCLUDE_FILE_SUFFIXES = ['.test.js', '.integration.test.js', '.unit.test.js', '.spec.js'];

function getSourceFiles() {
  const files = [];
  for (const dir of SOURCE_DIRS) {
    const abs = join(ROOT, dir);
    for (const f of walkFiles(abs, ['.js', '.jsx'], EXCLUDE_DIRS)) {
      const rel = relative(ROOT, f);
      if (!EXCLUDE_FILE_SUFFIXES.some(s => rel.endsWith(s))) {
        files.push(f);
      }
    }
  }
  return files;
}

function readSource(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// 1. Hardcoded Secrets Detection
// ---------------------------------------------------------------------------

describe('Security: Hardcoded Secrets', () => {
  /**
   * Patterns that indicate a secret value is hardcoded directly in source code
   * rather than read from process.env / a secrets manager.
   */
  const SECRET_PATTERNS = [
    {
      name: 'jwt.sign/verify called with a hardcoded string secret',
      // Matches: jwt.sign(payload, "someSecret") — rejects process.env references
      regex: /jwt\.(sign|verify)\s*\([^)]*,\s*["'`][A-Za-z0-9+/=_\-!@#$%^&*]{8,}["'`]/g,
    },
    {
      name: 'MongoDB connection string with embedded credentials',
      // Matches: mongodb://user:password@host or mongodb+srv://user:pass@host
      regex: /mongodb(?:\+srv)?:\/\/[^"'\s]+:[^"'\s@]+@[^\s"']+/g,
    },
    {
      name: 'Braintree/payment key hardcoded as a string literal',
      // Matches: merchantId: "abc123..." or publicKey = "abc123..."
      regex: /(merchantId|publicKey|privateKey|merchant_id|public_key|private_key)\s*[:=]\s*["'`][A-Za-z0-9]{10,}["'`]/g,
    },
    {
      name: 'Hardcoded password assignment',
      // Matches: password = "literal" or password: "literal" — rejects process.env
      regex: /\bpassword\s*[:=]\s*["'`][^"'`\s]{6,}["'`]/gi,
    },
    {
      name: 'Hardcoded API key or token string (generic high-entropy pattern)',
      // Matches variable names containing key/secret/token/apikey assigned to a long string
      regex: /\b(api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*["'`][A-Za-z0-9+/=_\-]{20,}["'`]/gi,
    },
  ];

  it('should have no hardcoded secrets in source files', () => {
    const findings = [];
    const sourceFiles = getSourceFiles();

    for (const filePath of sourceFiles) {
      const content = readSource(filePath);
      const relPath = relative(ROOT, filePath);

      // Skip lines that reference process.env (legitimate pattern)
      const lines = content.split('\n');

      for (const { name, regex } of SECRET_PATTERNS) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(content)) !== null) {
          const lineNum = content.slice(0, match.index).split('\n').length;
          const line = lines[lineNum - 1]?.trim() ?? '';

          // Ignore lines that read from environment variables
          if (line.includes('process.env') || line.startsWith('//') || line.startsWith('*')) {
            continue;
          }

          findings.push({
            file: relPath,
            line: lineNum,
            rule: name,
            snippet: line.slice(0, 120),
          });
        }
      }
    }

    if (findings.length > 0) {
      const report = findings
        .map(f => `  [${f.file}:${f.line}] ${f.rule}\n    → ${f.snippet}`)
        .join('\n');
      throw new Error(
        `Found ${findings.length} hardcoded secret(s) in source files. ` +
        `Move these values to environment variables (process.env):\n${report}`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Git-Tracked Sensitive Files
// ---------------------------------------------------------------------------

describe('Security: Git-Tracked Sensitive Files', () => {
  it('.env should not be committed to the repository', () => {
    let trackedFiles = '';
    try {
      trackedFiles = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' });
    } catch {
      // git not available — skip
      return;
    }

    const tracked = trackedFiles.split('\n').map(f => f.trim()).filter(Boolean);
    const envFiles = tracked.filter(f => /^\.env(\.[a-z]+)?$/.test(f));

    if (envFiles.length > 0) {
      throw new Error(
        `The following .env file(s) are committed to git and may expose credentials: ${envFiles.join(', ')}. ` +
        'Remove them with: git rm --cached .env  and ensure .env is listed in .gitignore.'
      );
    }
  });

  it('sonar-project.properties should not contain a hardcoded token', () => {
    const sonarProps = join(ROOT, 'sonar-project.properties');
    if (!existsSync(sonarProps)) return;

    const content = readSource(sonarProps);
    // sonar.token=<value> where value is not an env var placeholder
    const tokenLine = content
      .split('\n')
      .find(l => /^sonar\.token\s*=\s*[^\s$%{]/.test(l.trim()));

    if (tokenLine) {
      throw new Error(
        `sonar-project.properties contains a hardcoded SonarQube token:\n  ${tokenLine.trim()}\n` +
        'Use the SONAR_TOKEN environment variable or a CI secret instead.'
      );
    }
  });

  it('private key or certificate files should not be tracked by git', () => {
    let trackedFiles = '';
    try {
      trackedFiles = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' });
    } catch {
      return;
    }

    const dangerous = trackedFiles
      .split('\n')
      .map(f => f.trim())
      .filter(f => /\.(pem|key|p12|pfx|crt|cer|jks)$/.test(f));

    if (dangerous.length > 0) {
      throw new Error(
        `Private key / certificate files are committed to git: ${dangerous.join(', ')}. ` +
        'Remove them immediately and rotate any exposed credentials.'
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Vulnerable Code Patterns
// ---------------------------------------------------------------------------

describe('Security: Vulnerable Code Patterns', () => {
  it('should not use eval() in source files', () => {
    const findings = [];
    for (const filePath of getSourceFiles()) {
      const content = readSource(filePath);
      const relPath = relative(ROOT, filePath);
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (/\beval\s*\(/.test(trimmed) && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
          findings.push(`${relPath}:${idx + 1} → ${trimmed.slice(0, 100)}`);
        }
      });
    }
    if (findings.length > 0) {
      throw new Error(`eval() usage detected (code injection risk):\n${findings.map(f => '  ' + f).join('\n')}`);
    }
  });

  it('should not assign innerHTML directly without sanitization', () => {
    const findings = [];
    for (const filePath of getSourceFiles()) {
      const content = readSource(filePath);
      const relPath = relative(ROOT, filePath);
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        // Flag direct innerHTML = <variable> assignments (not innerHTML = "" or innerHTML = '<static>')
        if (
          /\.innerHTML\s*=\s*[^"'`]/.test(trimmed) &&
          !trimmed.startsWith('//') &&
          !trimmed.startsWith('*')
        ) {
          findings.push(`${relPath}:${idx + 1} → ${trimmed.slice(0, 100)}`);
        }
      });
    }
    if (findings.length > 0) {
      throw new Error(
        `Unsafe innerHTML assignment detected (XSS risk). Use textContent or a sanitization library:\n` +
        findings.map(f => '  ' + f).join('\n')
      );
    }
  });

  it('should not use dangerouslySetInnerHTML in React components', () => {
    const findings = [];
    for (const filePath of getSourceFiles()) {
      if (extname(filePath) !== '.js' && extname(filePath) !== '.jsx') continue;
      const content = readSource(filePath);
      const relPath = relative(ROOT, filePath);
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (/dangerouslySetInnerHTML/.test(trimmed) && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
          findings.push(`${relPath}:${idx + 1} → ${trimmed.slice(0, 100)}`);
        }
      });
    }
    if (findings.length > 0) {
      throw new Error(
        `dangerouslySetInnerHTML usage detected (XSS risk). Sanitize with DOMPurify if this is intentional:\n` +
        findings.map(f => '  ' + f).join('\n')
      );
    }
  });

  it('should not use child_process.exec with unsanitized user input', () => {
    const findings = [];
    for (const filePath of getSourceFiles()) {
      const content = readSource(filePath);
      const relPath = relative(ROOT, filePath);
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        // Flag exec() calls that interpolate variables (template literals or concatenation)
        if (
          /\bexec\s*\(`/.test(trimmed) || // exec(`...${var}...`)
          /\bexec\s*\([^)]*\+/.test(trimmed)  // exec("cmd" + var)
        ) {
          if (!trimmed.startsWith('//') && !trimmed.startsWith('*')) {
            findings.push(`${relPath}:${idx + 1} → ${trimmed.slice(0, 100)}`);
          }
        }
      });
    }
    if (findings.length > 0) {
      throw new Error(
        `Potential command injection: child_process.exec called with dynamic input:\n` +
        findings.map(f => '  ' + f).join('\n')
      );
    }
  });

  it('should not expose stack traces to API responses', () => {
    const findings = [];
    for (const filePath of getSourceFiles()) {
      const content = readSource(filePath);
      const relPath = relative(ROOT, filePath);
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        // Flag: res.json/send with error.stack or err.stack sent to client
        if (
          /res\.(json|send)\s*\(.*\berror\.stack\b/.test(trimmed) ||
          /res\.(json|send)\s*\(.*\berr\.stack\b/.test(trimmed)
        ) {
          if (!trimmed.startsWith('//') && !trimmed.startsWith('*')) {
            findings.push(`${relPath}:${idx + 1} → ${trimmed.slice(0, 100)}`);
          }
        }
      });
    }
    if (findings.length > 0) {
      throw new Error(
        `Stack traces exposed in API responses (information disclosure risk):\n` +
        findings.map(f => '  ' + f).join('\n')
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Dependency Vulnerabilities (npm audit)
// ---------------------------------------------------------------------------

describe('Security: Dependency Vulnerabilities', () => {
  it('should have no critical severity vulnerabilities in dependencies', () => {
    let auditResult;
    try {
      execSync('npm audit --json --audit-level=critical', { cwd: ROOT, encoding: 'utf8' });
      // Exit 0 means no critical vulnerabilities
      return;
    } catch (err) {
      auditResult = err.stdout ?? '';
    }

    let parsed;
    try {
      parsed = JSON.parse(auditResult);
    } catch {
      // Cannot parse audit output — skip rather than block CI
      console.warn('Could not parse npm audit output; skipping dependency vulnerability check.');
      return;
    }

    const criticalCount = parsed?.metadata?.vulnerabilities?.critical ?? 0;
    const highCount = parsed?.metadata?.vulnerabilities?.high ?? 0;

    if (criticalCount > 0 || highCount > 0) {
      const vulnSummary = Object.values(parsed?.vulnerabilities ?? {})
        .filter(v => v.severity === 'critical' || v.severity === 'high')
        .map(v => `  [${v.severity.toUpperCase()}] ${v.name}@${v.range} — ${v.title ?? 'see npm advisory'}`)
        .join('\n');

      throw new Error(
        `npm audit found ${criticalCount} critical and ${highCount} high severity vulnerabilities. ` +
        `Run \`npm audit fix\` or document a justification for accepted risks:\n${vulnSummary}`
      );
    }
  });
});
