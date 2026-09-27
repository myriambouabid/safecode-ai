package com.safecode.model;

/** Request body for the fix endpoint. */
public class FixRequest {

    private String findingId;

    public FixRequest() {}

    public FixRequest(String findingId) {
        this.findingId = findingId;
    }

    public String getFindingId()            { return findingId; }
    public void   setFindingId(String v)    { this.findingId = v; }
}
