package com.safecode.controller;

import com.safecode.model.AuditRequest;
import com.safecode.model.AuditResponse;
import com.safecode.model.FixRequest;
import com.safecode.model.FixResponse;
import com.safecode.service.AuditService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    /** Run a full security audit on the given repository URL. */
    @PostMapping("/audit")
    public ResponseEntity<AuditResponse> audit(@Valid @RequestBody AuditRequest request) {
        AuditResponse response = auditService.audit(request);
        return ResponseEntity.ok(response);
    }

    /** Retrieve a previously-run audit by ID. */
    @GetMapping("/audit/{id}")
    public ResponseEntity<AuditResponse> getAudit(@PathVariable Long id) {
        // Stub: in-memory storage not yet implemented — return 404 for unknown IDs
        return ResponseEntity.notFound().build();
    }

    /** Apply an AI-generated fix for a specific finding within an audit. */
    @PostMapping("/audit/{id}/fix")
    public ResponseEntity<FixResponse> fix(
            @PathVariable Long id,
            @RequestBody FixRequest request) {
        FixResponse response = auditService.fix(id, request.getFindingId());
        return ResponseEntity.ok(response);
    }
}
