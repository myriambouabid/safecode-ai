package com.safecode.model;

import jakarta.validation.constraints.NotBlank;

public class AuditRequest {

    @NotBlank(message = "repoUrl must not be blank")
    private String repoUrl;

    public AuditRequest() {}

    public AuditRequest(String repoUrl) {
        this.repoUrl = repoUrl;
    }

    public String getRepoUrl() {
        return repoUrl;
    }

    public void setRepoUrl(String repoUrl) {
        this.repoUrl = repoUrl;
    }
}
