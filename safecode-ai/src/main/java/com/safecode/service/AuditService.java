package com.safecode.service;

import com.safecode.model.AuditRequest;
import com.safecode.model.AuditResponse;
import com.safecode.model.Finding;
import com.safecode.model.FixResponse;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;

/**
 * Runs an OWASP ASVS Level 1 security audit against a remote Git repository.
 */
@Service
public class AuditService {

    // ── In-memory audit store (keyed by auditId) ─────────────────────────────
    private final Map<Long, AuditResponse> auditStore = new HashMap<>();
    private final AtomicInteger auditIdSeq = new AtomicInteger(1);

    // ── Category A - Access Control ──────────────────────────────────────────
    private static final Pattern ACCESS_BYPASS = Pattern.compile(
            "(?i)(if\\s*\\(.*\\b(admin|superuser|root)\\b|skip.{0,10}auth|no.{0,10}auth"
            + "|role\\s*[=!]=\\s*[\"']admin[\"']|isAdmin\\s*=\\s*true"
            + "|hasRole\\s*\\(\\s*[\"']ADMIN[\"']\\s*\\)\\s*==\\s*false"
            + "|permit\\s*all|permitAll\\s*\\(\\s*\\))");

    // ── Category B - Input Validation ────────────────────────────────────────
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

    // ── Category C - API Security ────────────────────────────────────────────
    private static final Pattern CORS_WILDCARD = Pattern.compile(
            "Access-Control-Allow-Origin.*\\*|cors.*origin.*\\*|allowedOrigins.*\\*",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern SENSITIVE_IN_RESPONSE = Pattern.compile(
            "(?i)(return\\s+.*\\b(password|secret|token|api_key|private_key)\\b"
            + "|ResponseEntity\\.ok\\(.*\\b(password|secret|token)\\b"
            + "|new\\s+\\w+Response\\(.*\\b(password|secret|token)\\b"
            + "|record\\s+\\w+\\(.*\\b(password|secret|token)\\b"
            + "|\\.put\\s*\\(\\s*[\"'](password|secret|token|api_key)[\"'])");

    // ── Category D - Secrets Handling ────────────────────────────────────────
    private static final Pattern HARDCODED_SECRET = Pattern.compile(
            "(?i)(?<!\\?)(?<!&)(password|passwd|pwd|secret|api_key|apikey|private_key|access_key)\\s*=\\s*[\"'][^\"']{3,}",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern PRIVATE_KEY_BLOCK = Pattern.compile(
            "-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----");
    private static final Pattern WEAK_HASH = Pattern.compile(
            "(?i)(MessageDigest\\.getInstance\\s*\\(\\s*[\"']MD5[\"']\\s*\\)"
            + "|MessageDigest\\.getInstance\\s*\\(\\s*[\"']SHA-1[\"']\\s*\\)"
            + "|hashlib\\.md5\\s*\\(|new\\s+MD5\\s*\\(|DigestUtils\\.md5"
            + "|String\\s+\\w*[Mm][Dd]5\\w*\\s*=)");
    private static final Pattern WEAK_CIPHER = Pattern.compile(
            "(?i)(AES.*ECB|Cipher\\.getInstance\\(\"AES\"\\))");

    // ── Category E - Security Configuration ─────────────────────────────────
    private static final Pattern DEBUG_ENABLED = Pattern.compile(
            "(?i)(DEBUG\\s*=\\s*True|debug\\s*[:=]\\s*true|NODE_ENV.*development)");
    private static final Pattern STACK_TRACE_LEAK = Pattern.compile(
            "(?i)(printStackTrace\\(\\)|traceback\\.print_exc\\(\\)|console\\.error.*err\\.stack)");

    private static final List<String> TEXT_EXTENSIONS = List.of(
            ".java", ".kt", ".groovy", ".py", ".js", ".ts", ".jsx", ".tsx",
            ".go", ".rb", ".php", ".cs", ".cpp", ".c", ".h", ".rs",
            ".xml", ".yml", ".yaml", ".json", ".properties", ".env",
            ".toml", ".ini", ".conf", ".sh", ".tf", ".gradle");

    private static final List<String> EXCLUDED_PREFIXES = List.of(
            "src/it/", "src/test/", ".mvn/", "config/",
            "src/main/resources/webgoat/static/",
            "src/main/resources/lessons/challenges/js/",
            "src/main/resources/webwolf/static/");

    // ── Public API ────────────────────────────────────────────────────────────

    public AuditResponse audit(AuditRequest request) {
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("safecode-audit-");
            cloneRepository(request.getRepoUrl(), tempDir);
            List<Finding> findings = scanRepository(tempDir);
            int score = calculateScore(findings);
            long auditId = auditIdSeq.getAndIncrement();
            AuditResponse response = new AuditResponse(score, findings.size(), findings);
            response.setAuditId(auditId);
            auditStore.put(auditId, response);
            return response;
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Audit failed for " + request.getRepoUrl(), e);
        } finally {
            if (tempDir != null) deleteDirectory(tempDir);
        }
    }

    public AuditResponse getAudit(Long id) {
        return auditStore.get(id);
    }

    public FixResponse fix(Long auditId, String findingId) {
        AuditResponse audit = auditStore.get(auditId);
        if (audit == null) {
            throw new RuntimeException("Audit not found: " + auditId);
        }
        Finding target = audit.getFindings().stream()
                .filter(f -> f.getId().equals(findingId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Finding not found: " + findingId));

        String original = target.getEvidence() != null ? target.getEvidence() : "// original code";
        String fixed    = "// ✅ Fixed: " + target.getFix() + "\n// Vulnerability removed.";

        // Recalculate score: remove this finding and recompute
        List<Finding> remaining = audit.getFindings().stream()
                .filter(f -> !f.getId().equals(findingId))
                .toList();
        int newScore = calculateScore(remaining);
        audit.setScore(newScore);

        return new FixResponse(findingId, original, fixed, newScore);
    }

    // ── Git clone ─────────────────────────────────────────────────────────────

    private void cloneRepository(String repoUrl, Path targetDir)
            throws IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder(
                "git", "-c", "http.version=HTTP/1.1",
                "clone", "--depth", "1", "--quiet", repoUrl, targetDir.toString());
        pb.redirectErrorStream(true);
        Process process = pb.start();
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        boolean finished = process.waitFor(5, TimeUnit.MINUTES);
        if (!finished) { process.destroyForcibly(); throw new RuntimeException("git clone timed out"); }
        if (process.exitValue() != 0)
            throw new RuntimeException("git clone failed: " + output.trim());
    }

    // ── Scan ─────────────────────────────────────────────────────────────────

    private List<Finding> scanRepository(Path repoRoot) throws IOException {
        List<Finding> findings = new ArrayList<>();
        int[] counter = {1};
        Files.walkFileTree(repoRoot, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                if (isTextFile(file)) {
                    String relative = repoRoot.relativize(file).toString().replace('\\', '/');
                    if (!isExcluded(relative)) {
                        List<String> lines = Files.readAllLines(file, StandardCharsets.UTF_8);
                        checkFile(relative, lines, findings, counter);
                    }
                }
                return FileVisitResult.CONTINUE;
            }
            @Override
            public FileVisitResult visitFileFailed(Path file, IOException exc) {
                return FileVisitResult.CONTINUE;
            }
        });
        return Collections.unmodifiableList(findings);
    }

    private void checkFile(String relPath, List<String> lines, List<Finding> findings, int[] counter) {
        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            int ln = i + 1;
            if (match(ACCESS_BYPASS, line))
                findings.add(new Finding(id(counter), "Access Control", "High", relPath, ln,
                        "Suspicious access-control bypass pattern detected.", truncate(line),
                        "Replace hard-coded role checks with a proper RBAC/authorization framework."));
            if (match(SQL_INJECTION, line))
                findings.add(new Finding(id(counter), "Input Validation", "High", relPath, ln,
                        "Potential SQL injection: user input concatenated into a query.", truncate(line),
                        "Use parameterized queries or prepared statements."));
            if (match(CMD_INJECTION, line))
                findings.add(new Finding(id(counter), "Input Validation", "Critical", relPath, ln,
                        "Potential command injection: user input passed to a shell executor.", truncate(line),
                        "Avoid shell execution with user input."));
            if (match(PATH_TRAVERSAL, line))
                findings.add(new Finding(id(counter), "Input Validation", "High", relPath, ln,
                        "Potential path traversal: user-controlled value used in a file path.", truncate(line),
                        "Canonicalize and validate file paths."));
            if (match(EVAL_INJECTION, line))
                findings.add(new Finding(id(counter), "Input Validation", "Critical", relPath, ln,
                        "Unsafe eval or template injection detected.", truncate(line),
                        "Remove eval usage. Use safe templating with auto-escaping."));
            if (match(CORS_WILDCARD, line))
                findings.add(new Finding(id(counter), "API Security", "Medium", relPath, ln,
                        "CORS wildcard (*) allows any origin to access the API.", truncate(line),
                        "Restrict CORS to explicitly listed trusted origins."));
            if (match(SENSITIVE_IN_RESPONSE, line))
                findings.add(new Finding(id(counter), "API Security", "High", relPath, ln,
                        "Sensitive field may be included in an API response.", truncate(line),
                        "Exclude secrets and credentials from response DTOs."));
            if (match(HARDCODED_SECRET, line))
                findings.add(new Finding(id(counter), "Secrets Handling", "Critical", relPath, ln,
                        "Hard-coded credential or secret found in source file.", truncate(line),
                        "Move all credentials to environment variables or a secrets manager."));
            if (match(PRIVATE_KEY_BLOCK, line))
                findings.add(new Finding(id(counter), "Secrets Handling", "Critical", relPath, ln,
                        "Private key material committed to the repository.", truncate(line),
                        "Remove the key and rotate it immediately."));
            if (match(WEAK_HASH, line))
                findings.add(new Finding(id(counter), "Secrets Handling", "Medium", relPath, ln,
                        "Weak hashing algorithm (MD5 or SHA-1) detected.", truncate(line),
                        "Replace with SHA-256 or stronger."));
            if (match(WEAK_CIPHER, line))
                findings.add(new Finding(id(counter), "Secrets Handling", "Medium", relPath, ln,
                        "AES used without explicit mode — defaults to insecure ECB mode.", truncate(line),
                        "Always specify AES/GCM/NoPadding."));
            if (match(DEBUG_ENABLED, line))
                findings.add(new Finding(id(counter), "Security Configuration", "Low", relPath, ln,
                        "Debug mode or development environment flag detected.", truncate(line),
                        "Ensure DEBUG is disabled in all production configuration files."));
            if (match(STACK_TRACE_LEAK, line))
                findings.add(new Finding(id(counter), "Security Configuration", "Low", relPath, ln,
                        "Stack trace may be leaked to clients.", truncate(line),
                        "Log stack traces server-side only. Return generic error messages to clients."));
        }
    }

    // ── Score ─────────────────────────────────────────────────────────────────

    private int calculateScore(List<Finding> findings) {
        boolean a = false, b = false, c = false, d = false, e = false;
        for (Finding f : findings) {
            switch (f.getCategory()) {
                case "Access Control"         -> a = true;
                case "Input Validation"       -> b = true;
                case "API Security"           -> c = true;
                case "Secrets Handling"       -> d = true;
                case "Security Configuration" -> e = true;
            }
        }
        int pass = (a ? 0 : 1) + (b ? 0 : 1) + (c ? 0 : 1) + (d ? 0 : 1) + (e ? 0 : 1);
        return (pass * 100) / 5;
    }

    // ── Cleanup ───────────────────────────────────────────────────────────────

    private void deleteDirectory(Path dir) {
        try {
            Files.walkFileTree(dir, new SimpleFileVisitor<>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    file.toFile().setWritable(true);
                    Files.delete(file);
                    return FileVisitResult.CONTINUE;
                }
                @Override
                public FileVisitResult visitFileFailed(Path file, IOException exc) {
                    file.toFile().setWritable(true);
                    try { Files.delete(file); } catch (IOException ignored) {}
                    return FileVisitResult.CONTINUE;
                }
                @Override
                public FileVisitResult postVisitDirectory(Path d, IOException exc) throws IOException {
                    Files.delete(d);
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException e) {
            System.err.println("[AuditService] Warning: could not fully delete temp dir " + dir);
        }
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    private static boolean match(Pattern p, String line)  { return p.matcher(line).find(); }
    private static String  truncate(String line)           { String t = line.strip(); return t.length() <= 120 ? t : t.substring(0, 117) + "..."; }
    private static String  id(int[] counter)               { return String.format("AUDIT-%03d", counter[0]++); }
    private static boolean isTextFile(Path file)           { String n = file.getFileName().toString().toLowerCase(); return TEXT_EXTENSIONS.stream().anyMatch(n::endsWith); }
    private static boolean isExcluded(String path)         { return EXCLUDED_PREFIXES.stream().anyMatch(path::startsWith); }
}
