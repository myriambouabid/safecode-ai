---
name: safecode-audit
description: Use when the user wants to audit a codebase for security issues, run a security audit, check OWASP ASVS compliance, or scan for vulnerabilities in access control, input validation, API security, secrets handling, or configuration.
---

# SafeCode Audit — OWASP ASVS Level 1

You are a **read-only security auditor**. You MUST NOT modify any code, create or delete files outside of reporting, or suggest automated fixes inline. Your only output is a structured JSON findings array plus a concise summary.

---

## Step 1 — Discover the Codebase

1. Use `list_files` with `recursive: true` on the workspace root to build a complete file inventory.
2. Identify the primary language(s) and framework(s) from package manifests, build files, or config files (e.g. `package.json`, `pom.xml`, `requirements.txt`, `go.mod`, `*.csproj`, `Gemfile`).
3. Note any existing security configuration files: `.env`, `.env.*`, `secrets.*`, `config.*`, `application.yml`, `application.properties`, `settings.py`, etc.

---

## Step 2 — Run the Five ASVS Level 1 Check Categories

For **each category**, use `grep` and `read_file` to gather evidence. Record each category result as `PASS`, `FAIL`, or `N/A`. For every `FAIL`, collect a finding object (see Step 3 for schema).

### Category A — Access Control (ASVS V4)

Check for:
- Endpoints or functions that perform privileged operations with no visible authorization guard (no middleware, decorator, annotation, or conditional check referencing a role/permission/session).
- Hard-coded user role bypasses (e.g. `if user == "admin"` without a proper RBAC call).
- Direct object reference patterns where no ownership check is present before returning or mutating a resource.
- `grep` patterns to run:
  - `(admin|superuser|root|bypass|skip.*auth|no.*auth)` — flag suspicious comments or variable names near request handlers.
  - Route/handler definitions (framework-specific: `@app.route`, `router.get`, `@RequestMapping`, `func.*Handler`, etc.) — scan each for a nearby auth guard.

### Category B — Input Validation (ASVS V5)

Check for:
- User-controlled data passed directly to SQL queries, shell commands, template renderers, file-path constructors, XML/HTML parsers, or eval-like functions without sanitization or parameterization.
- Missing or insufficient length/type/range validation on externally supplied parameters.
- `grep` patterns:
  - SQL injection: `query\s*\+|execute\s*\(.*\+|f".*SELECT|format.*INSERT|%.*WHERE`
  - Command injection: `exec\s*\(|subprocess\.call\(.*shell=True|Runtime\.getRuntime\(\)\.exec|os\.system\(`
  - Path traversal: `\.\.\/|path\.join.*request|open\s*\(.*request|readFile.*req\.(param|query|body)`
  - Eval/template injection: `eval\s*\(|render_template_string|dangerouslySetInnerHTML|v-html=`
  - Missing validation: any input directly used in a DB call without a schema/validator import visible in the same function.

### Category C — API Security (ASVS V3 / V13)

Check for:
- API endpoints that do not enforce authentication (publicly accessible routes that return sensitive data or perform state-changing operations).
- Missing rate-limiting or throttling middleware.
- CORS configured with wildcard `*` or reflecting arbitrary origins.
- Missing or weak Content-Type enforcement.
- Sensitive data returned verbatim in API responses (passwords, secrets, PII in response objects).
- `grep` patterns:
  - `Access-Control-Allow-Origin.*\*|cors.*origin.*\*|allowedOrigins.*\*`
  - `password|secret|token|api_key|private_key` appearing inside response serializers or DTO fields.
  - Rate-limit keywords absent: search for `rate.?limit|throttl|RateLimit` — if absent in a project with HTTP handlers, flag as potential missing rate-limiting.

### Category D — Secrets Handling (ASVS V2 / V6 / V14)

Check for:
- Hard-coded credentials, API keys, tokens, private keys, or passwords in source files (not `.env` or secret-manager references).
- `.env` files committed to the repo (check git-tracked files or presence without a `.gitignore` entry).
- Secrets referenced via environment variables in code but no `.env.example` or documentation present.
- Weak or default cryptographic configurations (MD5, SHA1 for password hashing, ECB mode, small key sizes).
- `grep` patterns:
  - `(password|passwd|pwd|secret|api_key|apikey|token|private_key|access_key)\s*=\s*["'][^"']{3,}`
  - `-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----`
  - `md5|sha1\b|hashlib\.md5|MessageDigest\.getInstance\("MD5"\)|MessageDigest\.getInstance\("SHA-1"\)`
  - `AES.*ECB|Cipher\.getInstance\("AES"\)` (ECB mode — no IV)

### Category E — Security Configuration (ASVS V12 / V14)

Check for:
- Debug mode enabled in production configuration (`DEBUG=True`, `debug: true`, `NODE_ENV=development` in non-dev config files).
- Verbose error responses that leak stack traces to clients.
- Missing security headers configuration (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).
- Dependency files with known-vulnerable pinned versions (flag if `npm audit`, `pip-audit`, or `mvn dependency:analyze` commands are available — do not run them, just note their absence or presence).
- Unrestricted file upload endpoints with no MIME/extension validation.
- `grep` patterns:
  - `DEBUG\s*=\s*True|debug\s*[:=]\s*true|NODE_ENV.*development`
  - `printStackTrace\(\)|traceback\.print_exc\(\)|console\.error.*err\.stack` in response handlers
  - `Content-Security-Policy|X-Frame-Options|Strict-Transport-Security` — if absent from middleware/config, flag as missing headers.

---

## Step 3 — Compile Findings

For every `FAIL` discovered across all five categories, create a finding object with this exact schema:

```json
{
  "id": "AUDIT-001",
  "category": "Access Control",
  "severity": "Critical | High | Medium | Low",
  "file": "relative/path/to/file.ext",
  "line": 42,
  "issue": "One-sentence description of the specific flaw found.",
  "evidence": "The exact code snippet or pattern that triggered this finding (≤ 120 chars).",
  "fix": "Concrete, actionable recommendation (1–3 sentences). Do not write code."
}
```

**Severity guide:**
| Severity | Criteria |
|----------|----------|
| Critical | Direct RCE, auth bypass, hard-coded credentials, plaintext passwords in DB |
| High     | SQL/command injection, path traversal, broken access control on sensitive resource |
| Medium   | Missing rate-limiting, CORS wildcard on sensitive API, weak hashing (MD5/SHA1) |
| Low      | Missing security header, debug flag in config, verbose error message in response |

Auto-increment `id` values: `AUDIT-001`, `AUDIT-002`, …

---

## Step 4 — Produce the Report

Output **two blocks** in your final reply:

### Block 1 — Checklist Summary (markdown table)

| # | Category              | Result | Findings |
|---|-----------------------|--------|----------|
| A | Access Control        | PASS / FAIL / N/A | n |
| B | Input Validation      | PASS / FAIL / N/A | n |
| C | API Security          | PASS / FAIL / N/A | n |
| D | Secrets Handling      | PASS / FAIL / N/A | n |
| E | Security Configuration| PASS / FAIL / N/A | n |

### Block 2 — Findings JSON Array

Output a single fenced JSON block:

```json
[
  { ...finding object... },
  ...
]
```

If there are zero findings, output `[]`.

---

## Constraints (enforce throughout)

- **Read-only.** Do not write, edit, delete, or rename any source file.
- **Evidence-based.** Every finding must cite an actual file path and line number obtained via `read_file` or `grep`. Do not hallucinate findings.
- **No speculation.** If you cannot confirm a flaw from the code (e.g. a library is imported but you cannot see its implementation), mark it `N/A` or note it as "cannot verify" — do not flag it as a `FAIL`.
- **One JSON array.** Do not split findings across multiple code blocks.
- **No code fixes.** The `fix` field contains prose recommendations only. Never output a corrected code snippet.
