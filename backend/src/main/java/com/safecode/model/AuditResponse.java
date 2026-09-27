package com.safecode.model;

import java.util.List;

public class AuditResponse {

    private Long auditId;
    private int score;
    private int findingsCount;
    private List<Finding> findings;

    public AuditResponse() {}

    public AuditResponse(Long auditId, int score, int findingsCount, List<Finding> findings) {
        this.auditId = auditId;
        this.score = score;
        this.findingsCount = findingsCount;
        this.findings = findings;
    }

    public Long getAuditId() {
        return auditId;
    }

    public void setAuditId(Long auditId) {
        this.auditId = auditId;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public int getFindingsCount() {
        return findingsCount;
    }

    public void setFindingsCount(int findingsCount) {
        this.findingsCount = findingsCount;
    }

    public List<Finding> getFindings() {
        return findings;
    }

    public void setFindings(List<Finding> findings) {
        this.findings = findings;
    }
}
