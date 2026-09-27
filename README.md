# SafeCode AI

An automated OWASP ASVS Level 1 security auditing tool.  
Paste a public GitHub repository URL — the backend clones it, scans for vulnerabilities across five security categories, and returns a scored report with fix suggestions.

---

## Architecture

```
Browser (Angular)  →  ng dev proxy  →  Spring Boot API  →  git clone + regex scan
     :4200                :4200/api        :8080/api
```

| Layer    | Tech                        | Location        |
|----------|-----------------------------|-----------------|
| Frontend | Angular 19, TypeScript      | `frontend/`     |
| Backend  | Spring Boot 3, Java 21      | `safecode-ai/`  |

---

## Prerequisites

| Tool       | Version  | Install                          |
|------------|----------|----------------------------------|
| Java JDK   | 21+      | https://adoptium.net             |
| Maven      | 3.9+     | https://maven.apache.org         |
| Node.js    | 18+      | https://nodejs.org               |
| Git        | any      | https://git-scm.com              |

---

## Running locally

### 1 — Start the backend

```bash
cd safecode-ai
./mvnw spring-boot:run        # Linux / macOS
mvnw.cmd spring-boot:run      # Windows
```

The API starts on **http://localhost:8080**.

### 2 — Start the frontend

```bash
cd frontend
npm install
npm start
```

The Angular dev server starts on **http://localhost:4200** and proxies all `/api` calls to `localhost:8080` automatically via [`proxy.conf.json`](frontend/proxy.conf.json).

Open **http://localhost:4200** in your browser.

---

## API Endpoints

| Method | Path                       | Description                              |
|--------|----------------------------|------------------------------------------|
| POST   | `/api/audit`               | Run a security audit on a repository     |
| GET    | `/api/audit/{id}`          | Retrieve a previous audit by ID          |
| POST   | `/api/audit/{id}/fix`      | Apply a fix suggestion for a finding     |

### POST `/api/audit`

**Request**
```json
{ "repoUrl": "https://github.com/owner/repo" }
```

**Response**
```json
{
  "auditId": 1,
  "score": 60,
  "findingsCount": 4,
  "findings": [
    {
      "id": "AUDIT-001",
      "category": "Secrets Handling",
      "severity": "Critical",
      "file": "src/config.js",
      "line": 12,
      "issue": "Hard-coded credential found in source file.",
      "evidence": "const apiKey = \"sk-prod-abc123\";",
      "fix": "Move all credentials to environment variables or a secrets manager."
    }
  ]
}
```

### POST `/api/audit/{id}/fix`

**Request**
```json
{ "findingId": "AUDIT-001" }
```

**Response**
```json
{
  "findingId": "AUDIT-001",
  "originalCode": "const apiKey = \"sk-prod-abc123\";",
  "fixedCode": "// ✅ Fixed: Move credentials to env vars\n// Vulnerability removed.",
  "scoreAfter": 80
}
```

---

## Security scan categories

| Category               | ASVS Chapter | What is checked                                      |
|------------------------|--------------|------------------------------------------------------|
| Access Control         | V4           | Hard-coded role checks, auth bypass patterns         |
| Input Validation       | V5           | SQL injection, command injection, path traversal     |
| API Security           | V3 / V13     | CORS wildcards, sensitive fields in responses        |
| Secrets Handling       | V2 / V6      | Hard-coded credentials, weak hashing, weak ciphers   |
| Security Configuration | V12 / V14    | Debug flags, stack trace leaks                       |

Score = `(clean categories / 5) × 100`

---

## CORS configuration

The backend allows `http://localhost:4200` by default.  
To add production origins, set the environment variable before starting:

```bash
# Linux / macOS
export SAFECODE_CORS_ALLOWED_ORIGINS=https://your-frontend.com

# Windows PowerShell
$env:SAFECODE_CORS_ALLOWED_ORIGINS = "https://your-frontend.com"
```

Or edit [`application.properties`](safecode-ai/src/main/resources/application.properties):

```properties
safecode.cors.allowed-origins=https://your-frontend.com
```
