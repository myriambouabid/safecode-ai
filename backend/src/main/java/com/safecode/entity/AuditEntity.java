package com.safecode.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA entity that persists the result of one audit run.
 */
@Entity
@Table(name = "audits")
public class AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "repo_url", nullable = false, length = 2048)
    private String repoUrl;

    @Column(nullable = false)
    private int score;

    @Column(name = "findings_count", nullable = false)
    private int findingsCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "audit", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FindingEntity> findings = new ArrayList<>();

    @PrePersist
    void prePersist() {
        this.createdAt = Instant.now();
    }

    public AuditEntity() {}

    public AuditEntity(String repoUrl, int score, int findingsCount) {
        this.repoUrl = repoUrl;
        this.score = score;
        this.findingsCount = findingsCount;
    }

    // ---- Getters & Setters ----

    public Long getId()                              { return id; }

    public String getRepoUrl()                       { return repoUrl; }
    public void   setRepoUrl(String repoUrl)         { this.repoUrl = repoUrl; }

    public int getScore()                            { return score; }
    public void setScore(int score)                  { this.score = score; }

    public int getFindingsCount()                    { return findingsCount; }
    public void setFindingsCount(int findingsCount)  { this.findingsCount = findingsCount; }

    public Instant getCreatedAt()                    { return createdAt; }

    public List<FindingEntity> getFindings()         { return findings; }
    public void setFindings(List<FindingEntity> findings) { this.findings = findings; }
}
