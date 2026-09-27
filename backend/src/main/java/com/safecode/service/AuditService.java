package com.safecode.service;

import com.safecode.entity.AuditEntity;
import com.safecode.entity.FindingEntity;
import com.safecode.model.AuditRequest;
import com.safecode.model.AuditResponse;
import com.safecode.model.Finding;
import com.safecode.repository.AuditRepository;
import org.springframework.stereotype.Service;
import java.util.Optional;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Runs an OWASP ASVS Level 1 security audit against a remote Git repository.
 *
 * <p>Pipeline:
 * <ol>
 *   <li>Clone the repository into a temporary directory via {@code git clone}.</li>
 *   <li>Run the five check categories defined in the safecode-audit skill
 *       (Access Control, Input Validation, API Security, Secrets Handling,
 *       Security Configuration) by scanning the cloned files with regex patterns.</li>
 *   <li>Parse findings into {@link Finding} objects.</li>
 *   <li>Calculate score = (passedCategories / 5) * 100.</li>
 *   <li>Delete the temporary directory.</li>
 *   <li>Return an {@link AuditResponse} with score, findingsCount, and findings.</li>
 * </ol>
 */
@Service
public class AuditService {

    private final AuditRepository auditRepository;

    public AuditService(AuditRepository auditRepository) {
        this.auditRepository = auditRepository;
    }

    // -----------------------------------------------------------------------
    // Category A — Access Control (ASVS V4)
    // -----------------------------------------------------------------------
    // Match only hard-coded role/auth bypass patterns in code context, not
    // class names, package names, or test strings that happen to contain the word.
    private static final Pattern ACCESS_BYPASS = Pattern.compile(
            "(?i)(if\\s*\\(.*\\b(admin|superuser|root)\\b|skip.{0,10}auth|no.{0,10}auth"
            + "|role\\s*[=!]=\\s*[\"']admin[\"']|isAdmin\\s*=\\s*true"
            + "|hasRole\\s*\\(\\s*[\"']ADMIN[\"']\\s*\\)\\s*==\\s*false"
            + "|permit\\s*all|permitAll\\s*\\(\\s*\\))");

    // -----------------------------------------------------------------------
    // Category B — Input Validation (ASVS V5)
    // -----------------------------------------------------------------------
    private static final Pattern SQL_INJECTION = Pattern.compile(
            "query\\s*\\+|execute\\s*\\(.*\\+|\"\\s*\\+.*SELECT|format.*INSERT|%.*WHERE",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern CMD_INJECTION = Pattern.compile(
            "exec\\s*\\(|subprocess\\.call\\(.*shell\\s*=\\s*True|Runtime\\.getRuntime\\(\\)\\.exec|os\\.system\\(",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern PATH_TRAVERSAL = Pattern.compile(
            "\\.\\./|path\\.join.*request|readFile.*req\\.(param|query|body)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern EVAL_INJECTION = Pattern.compile(
            "eval\\s*\\(|render_template_string|dangerouslySetInnerHTML|v-html=",
            Pattern.CASE_INSENSITIVE);

    // -----------------------------------------------------------------------
    // Category C — API Security (ASVS V3 / V13)
    // -----------------------------------------------------------------------
    private static final Pattern CORS_WILDCARD = Pattern.compile(
            "Access-Control-Allow-Origin.*\\*|cors.*origin.*\\*|allowedOrigins.*\\*",
            Pattern.CASE_INSENSITIVE);
    // Require a serialization/return/field context — not just any line mentioning the word
    private static final Pattern SENSITIVE_IN_RESPONSE = Pattern.compile(
            "(?i)(return\\s+.*\\b(password|secret|token|api_key|private_key)\\b"
            + "|ResponseEntity\\.ok\\(.*\\b(password|secret|token)\\b"
            + "|new\\s+\\w+Response\\(.*\\b(password|secret|token)\\b"
            + "|record\\s+\\w+\\(.*\\b(password|secret|token)\\b"
            + "|\\.put\\s*\\(\\s*[\"'](password|secret|token|api_key)[\"'])");

    // -----------------------------------------------------------------------
    // Category D — Secrets Handling (ASVS V2 / V6 / V14)
    // -----------------------------------------------------------------------
    // Exclude URL query-param assignments (e.g. ?token=...) — require a code-level = "value"
    private static final Pattern HARDCODED_SECRET = Pattern.compile(
            "(?i)(?<!\\?)(?<!&)(password|passwd|pwd|secret|api_key|apikey|private_key|access_key)\\s*=\\s*[\"'][^\"']{3,}",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern PRIVATE_KEY_BLOCK = Pattern.compile(
            "-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----");
    // Require actual code usage: method call, variable declaration, or import — not a URL or XML value
    private static final Pattern WEAK_HASH = Pattern.compile(
            "(?i)(MessageDigest\\.getInstance\\s*\\(\\s*[\"']MD5[\"']\\s*\\)"
            + "|MessageDigest\\.getInstance\\s*\\(\\s*[\"']SHA-1[\"']\\s*\\)"
            + "|hashlib\\.md5\\s*\\("
            + "|new\\s+MD5\\s*\\("
            + "|DigestUtils\\.md5"
            + "|String\\s+\\w*[Mm][Dd]5\\w*\\s*=)");
    private static final Pattern WEAK_CIPHER = Pattern.compile(
            "(?i)(AES.*ECB|Cipher\\.getInstance\\(\"AES\"\\))");

    // -----------------------------------------------------------------------
    // Category E — Security Configuration (ASVS V12 / V14)
    // -----------------------------------------------------------------------
    private static final Pattern DEBUG_ENABLED = Pattern.compile(
            "(?i)(DEBUG\\s*=\\s*True|debug\\s*[:=]\\s*true|NODE_ENV.*development)");
    private static final Pattern STACK_TRACE_LEAK = Pattern.compile(
            "(?i)(printStackTrace\\(\\)|traceback\\.print_exc\\(\\)|console\\.error.*err\\.stack)");

    // Text-file extensions to scan (binary files are skipped)
    private static final List<String> TEXT_EXTENSIONS = List.of(
            ".java", ".kt", ".groovy", ".py", ".js", ".ts", ".jsx", ".tsx",
            ".go", ".rb", ".php", ".cs", ".cpp", ".c", ".h", ".rs",
            ".xml", ".yml", ".yaml", ".json", ".properties", ".env",
            ".toml", ".ini", ".conf", ".sh", ".tf", ".gradle");

    // Path prefixes to exclude from scanning (test code, generated config, vendored assets)
    private static final List<String> EXCLUDED_PREFIXES = List.of(
            "src/it/", "src/test/", ".mvn/", "config/",
            "src/main/resources/webgoat/static/",
            "src/main/resources/lessons/challenges/js/",
            "src/main/resources/webwolf/static/");

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Retrieves a previously saved audit by its database id.
     *
     * @param id the primary key of the audit record
     * @return an {@link Optional} containing the mapped {@link AuditResponse}, or empty if not found
     */
    public Optional<AuditResponse> findById(Long id) {
        return auditRepository.findById(id).map(this::toResponse);
    }

    /**
     * Audits the repository at {@code request.getRepoUrl()}.
     *
     * @param request the audit request carrying the repository URL
     * @return {@link AuditResponse} with score, findingsCount, and findings list
     * @throws RuntimeException if the git clone fails or the temp dir cannot be created
     */
    public AuditResponse audit(AuditRequest request) {
        Path tempDir = null;
        try {
            // Step 1 — Clone
            tempDir = Files.createTempDirectory("safecode-audit-");
            cloneRepository(request.getRepoUrl(), tempDir);

            // Step 2 & 3 — Scan (skill logic) and parse findings
            List<Finding> findings = scanRepository(tempDir);

            // Step 4 — Score: one category = 20 points; deduct for each failing category
            int score = calculateScore(findings);

            // Step 5 — Persist audit + findings
            AuditEntity auditEntity = new AuditEntity(request.getRepoUrl(), score, findings.size());
            for (Finding f : findings) {
                auditEntity.getFindings().add(new FindingEntity(
                        f.getId(), f.getCategory(), f.getSeverity(),
                        f.getFile(), f.getLine(),
                        f.getIssue(), f.getEvidence(), f.getFix(),
                        auditEntity));
            }
            auditRepository.save(auditEntity);

            // Step 6 — Return real response
            return new AuditResponse(score, findings.size(), findings);

        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Audit failed for " + request.getRepoUrl(), e);
        } finally {
            // Step 5 — Delete temp directory
            if (tempDir != null) {
                deleteDirectory(tempDir);
            }
        }
    }

    // -----------------------------------------------------------------------
    // Step 1 — Git clone via shell command
    // -----------------------------------------------------------------------

    private void cloneRepository(String repoUrl, Path targetDir)
            throws IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder(
                "git", "-c", "http.version=HTTP/1.1",
                "clone", "--depth", "1", "--quiet", repoUrl, targetDir.toString());
        pb.redirectErrorStream(true);
        Process process = pb.start();

        // Capture output for error reporting
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);

        boolean finished = process.waitFor(5, TimeUnit.MINUTES);
        if (!finished) {
            process.destroyForcibly();
            throw new RuntimeException("git clone timed out for: " + repoUrl);
        }
        if (process.exitValue() != 0) {
            throw new RuntimeException(
                    "git clone failed (exit " + process.exitValue() + ") for: " + repoUrl
                    + "\n" + output.trim());
        }
    }

    // -----------------------------------------------------------------------
    // Steps 2 & 3 — Skill scan: five ASVS Level 1 categories
    // -----------------------------------------------------------------------

    private List<Finding> scanRepository(Path repoRoot) throws IOException {
        List<Finding> findings = new ArrayList<>();
        int[] counter = {1};   // auto-increment for AUDIT-NNN ids

        Files.walkFileTree(repoRoot, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs)
                    throws IOException {
                if (isTextFile(file)) {
                    String relative = repoRoot.relativize(file).toString().replace('\\', '/');
                    if (isExcluded(relative)) {
                        return FileVisitResult.CONTINUE;
                    }
                    List<String> lines = Files.readAllLines(file, StandardCharsets.UTF_8);
                    checkFile(relative, lines, findings, counter);
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFileFailed(Path file, IOException exc) {
                // Skip unreadable files silently
                return FileVisitResult.CONTINUE;
            }
        });

        return Collections.unmodifiableList(findings);
    }

    /**
     * Runs all five category checks against a single file's lines.
     */
    private void checkFile(String relPath, List<String> lines,
                            List<Finding> findings, int[] counter) {
        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            int lineNo = i + 1;

            // ---- Category A — Access Control ----
            if (match(ACCESS_BYPASS, line)) {
                findings.add(new Finding(
                        id(counter), "Access Control", "High",
                        relPath, lineNo,
                        "Suspicious access-control bypass pattern detected.",
                        truncate(line),
                        "Replace hard-coded role checks with a proper RBAC/authorization framework. "
                        + "Ensure every privileged endpoint is protected by a verified auth guard."));
            }

            // ---- Category B — Input Validation ----
            if (match(SQL_INJECTION, line)) {
                findings.add(new Finding(
                        id(counter), "Input Validation", "High",
                        relPath, lineNo,
                        "Potential SQL injection: user input concatenated into a query.",
                        truncate(line),
                        "Use parameterized queries or prepared statements. "
                        + "Never concatenate user-controlled values into SQL strings."));
            }
            if (match(CMD_INJECTION, line)) {
                findings.add(new Finding(
                        id(counter), "Input Validation", "Critical",
                        relPath, lineNo,
                        "Potential command injection: user input passed to a shell executor.",
                        truncate(line),
                        "Avoid shell execution with user input. "
                        + "If unavoidable, use an allowlist and never pass raw user input to the shell."));
            }
            if (match(PATH_TRAVERSAL, line)) {
                findings.add(new Finding(
                        id(counter), "Input Validation", "High",
                        relPath, lineNo,
                        "Potential path traversal: user-controlled value used in a file path.",
                        truncate(line),
                        "Canonicalize and validate file paths. "
                        + "Reject paths that escape the intended root directory."));
            }
            if (match(EVAL_INJECTION, line)) {
                findings.add(new Finding(
                        id(counter), "Input Validation", "Critical",
                        relPath, lineNo,
                        "Unsafe eval or template injection: untrusted input rendered as code/HTML.",
                        truncate(line),
                        "Remove eval usage. Use safe templating with auto-escaping enabled. "
                        + "Never pass user input to dangerouslySetInnerHTML or equivalent."));
            }

            // ---- Category C — API Security ----
            if (match(CORS_WILDCARD, line)) {
                findings.add(new Finding(
                        id(counter), "API Security", "Medium",
                        relPath, lineNo,
                        "CORS wildcard (*) allows any origin to access the API.",
                        truncate(line),
                        "Restrict CORS to explicitly listed trusted origins. "
                        + "Never use '*' on endpoints that handle authenticated or sensitive data."));
            }
            if (match(SENSITIVE_IN_RESPONSE, line)) {
                findings.add(new Finding(
                        id(counter), "API Security", "High",
                        relPath, lineNo,
                        "Sensitive field (password/secret/token) may be included in an API response.",
                        truncate(line),
                        "Exclude secrets and credentials from response DTOs. "
                        + "Use a dedicated response model that omits sensitive fields."));
            }

            // ---- Category D — Secrets Handling ----
            if (match(HARDCODED_SECRET, line)) {
                findings.add(new Finding(
                        id(counter), "Secrets Handling", "Critical",
                        relPath, lineNo,
                        "Hard-coded credential or secret found in source file.",
                        truncate(line),
                        "Move all credentials to environment variables or a secrets manager. "
                        + "Rotate any exposed values immediately and audit git history."));
            }
            if (match(PRIVATE_KEY_BLOCK, line)) {
                findings.add(new Finding(
                        id(counter), "Secrets Handling", "Critical",
                        relPath, lineNo,
                        "Private key material committed to the repository.",
                        truncate(line),
                        "Remove the key from the repository and rotate it immediately. "
                        + "Store private keys only in a secrets manager or HSM."));
            }
            if (match(WEAK_HASH, line)) {
                findings.add(new Finding(
                        id(counter), "Secrets Handling", "Medium",
                        relPath, lineNo,
                        "Weak hashing algorithm (MD5 or SHA-1) detected.",
                        truncate(line),
                        "Replace with SHA-256 or stronger for general hashing. "
                        + "For password hashing, use bcrypt, scrypt, or Argon2."));
            }
            if (match(WEAK_CIPHER, line)) {
                findings.add(new Finding(
                        id(counter), "Secrets Handling", "Medium",
                        relPath, lineNo,
                        "AES used without explicit mode — defaults to insecure ECB mode.",
                        truncate(line),
                        "Always specify a secure mode and IV, e.g. AES/GCM/NoPadding. "
                        + "Never use ECB mode for encrypting more than one block."));
            }

            // ---- Category E — Security Configuration ----
            if (match(DEBUG_ENABLED, line)) {
                findings.add(new Finding(
                        id(counter), "Security Configuration", "Low",
                        relPath, lineNo,
                        "Debug mode or development environment flag detected in configuration.",
                        truncate(line),
                        "Ensure DEBUG is disabled and NODE_ENV is set to 'production' in all "
                        + "production configuration files."));
            }
            if (match(STACK_TRACE_LEAK, line)) {
                findings.add(new Finding(
                        id(counter), "Security Configuration", "Low",
                        relPath, lineNo,
                        "Stack trace printed or returned — may leak internal details to clients.",
                        truncate(line),
                        "Log stack traces server-side only. Return generic error messages to clients. "
                        + "Use a global exception handler to standardize error responses."));
            }
        }
    }

    // -----------------------------------------------------------------------
    // Step 4 — Score calculation
    // -----------------------------------------------------------------------

    /**
     * Score = (number of clean categories / 5) × 100.
     * A category is "clean" when no findings reference it.
     */
    private int calculateScore(List<Finding> findings) {
        final int TOTAL_CATEGORIES = 5;
        boolean accessControlFailed      = false;
        boolean inputValidationFailed    = false;
        boolean apiSecurityFailed        = false;
        boolean secretsHandlingFailed    = false;
        boolean securityConfigFailed     = false;

        for (Finding f : findings) {
            switch (f.getCategory()) {
                case "Access Control"        -> accessControlFailed      = true;
                case "Input Validation"      -> inputValidationFailed    = true;
                case "API Security"          -> apiSecurityFailed        = true;
                case "Secrets Handling"      -> secretsHandlingFailed    = true;
                case "Security Configuration"-> securityConfigFailed     = true;
            }
        }

        int passCount = (accessControlFailed      ? 0 : 1)
                      + (inputValidationFailed    ? 0 : 1)
                      + (apiSecurityFailed        ? 0 : 1)
                      + (secretsHandlingFailed    ? 0 : 1)
                      + (securityConfigFailed     ? 0 : 1);

        return (passCount * 100) / TOTAL_CATEGORIES;
    }

    // -----------------------------------------------------------------------
    // Step 5 — Temp directory cleanup
    // -----------------------------------------------------------------------

    private void deleteDirectory(Path dir) {
        try {
            Files.walkFileTree(dir, new SimpleFileVisitor<>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs)
                        throws IOException {
                    // Git pack files on Windows are read-only — make writable before deleting
                    file.toFile().setWritable(true);
                    Files.delete(file);
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult visitFileFailed(Path file, IOException exc) {
                    // If visiting failed (e.g. locked file), force writable and retry once
                    file.toFile().setWritable(true);
                    try { Files.delete(file); } catch (IOException ignored) {}
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult postVisitDirectory(Path d, IOException exc)
                        throws IOException {
                    Files.delete(d);
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException e) {
            // Log but do not rethrow — cleanup failure should not mask audit results
            System.err.println("[AuditService] Warning: could not fully delete temp dir "
                    + dir + ": " + e.getMessage());
        }
    }

    // -----------------------------------------------------------------------
    // Utilities
    // -----------------------------------------------------------------------

    private static boolean match(Pattern pattern, String line) {
        return pattern.matcher(line).find();
    }

    /** Truncates evidence to 120 characters as per the skill schema. */
    private static String truncate(String line) {
        String trimmed = line.strip();
        return trimmed.length() <= 120 ? trimmed : trimmed.substring(0, 117) + "...";
    }

    /** Generates the next AUDIT-NNN id and increments the counter. */
    private static String id(int[] counter) {
        return String.format("AUDIT-%03d", counter[0]++);
    }

    /** Returns true if the file has a text extension that should be scanned. */
    private static boolean isTextFile(Path file) {
        String name = file.getFileName().toString().toLowerCase();
        return TEXT_EXTENSIONS.stream().anyMatch(name::endsWith);
    }

    /** Returns true if the relative path should be skipped entirely. */
    private static boolean isExcluded(String relativePath) {
        return EXCLUDED_PREFIXES.stream().anyMatch(relativePath::startsWith);
    }

    // -----------------------------------------------------------------------
    // Entity → model mapper
    // -----------------------------------------------------------------------

    /** Maps a persisted {@link AuditEntity} (with its findings) to an {@link AuditResponse}. */
    private AuditResponse toResponse(AuditEntity entity) {
        List<Finding> findings = entity.getFindings().stream()
                .map(fe -> new Finding(
                        fe.getFindingRef(),
                        fe.getCategory(),
                        fe.getSeverity(),
                        fe.getFile(),
                        fe.getLine(),
                        fe.getIssue(),
                        fe.getEvidence(),
                        fe.getFix()))
                .toList();
        return new AuditResponse(entity.getScore(), entity.getFindingsCount(), findings);
    }
}
