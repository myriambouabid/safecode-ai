package com.safecode.model;

/**
 * Response returned by the fix endpoint ({@code POST /api/audit/{id}/fix}).
 */
public class FixResponse {

    private String findingId;
    private String originalCode;
    private String fixedCode;
    private Integer scoreAfter;

    public FixResponse() {}

    public FixResponse(String findingId, String originalCode,
                       String fixedCode, Integer scoreAfter) {
        this.findingId    = findingId;
        this.originalCode = originalCode;
        this.fixedCode    = fixedCode;
        this.scoreAfter   = scoreAfter;
    }

    public String  getFindingId()               { return findingId; }
    public void    setFindingId(String v)        { this.findingId = v; }

    public String  getOriginalCode()             { return originalCode; }
    public void    setOriginalCode(String v)     { this.originalCode = v; }

    public String  getFixedCode()                { return fixedCode; }
    public void    setFixedCode(String v)        { this.fixedCode = v; }

    public Integer getScoreAfter()               { return scoreAfter; }
    public void    setScoreAfter(Integer v)      { this.scoreAfter = v; }
}
