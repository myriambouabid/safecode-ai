package com.safecode.model;

/**
 * A single security finding produced by the OWASP ASVS Level 1 audit.
 */
public class Finding {

    private String id;
    private String category;
    private String severity;
    private String file;
    private int line;
    private String issue;
    private String evidence;
    private String fix;

    public Finding() {}

    public Finding(String id, String category, String severity,
                   String file, int line,
                   String issue, String evidence, String fix) {
        this.id       = id;
        this.category = category;
        this.severity = severity;
        this.file     = file;
        this.line     = line;
        this.issue    = issue;
        this.evidence = evidence;
        this.fix      = fix;
    }

    public String getId()               { return id; }
    public void   setId(String v)       { this.id = v; }

    public String getCategory()         { return category; }
    public void   setCategory(String v) { this.category = v; }

    public String getSeverity()         { return severity; }
    public void   setSeverity(String v) { this.severity = v; }

    public String getFile()             { return file; }
    public void   setFile(String v)     { this.file = v; }

    public int    getLine()             { return line; }
    public void   setLine(int v)        { this.line = v; }

    public String getIssue()            { return issue; }
    public void   setIssue(String v)    { this.issue = v; }

    public String getEvidence()         { return evidence; }
    public void   setEvidence(String v) { this.evidence = v; }

    public String getFix()              { return fix; }
    public void   setFix(String v)      { this.fix = v; }
}
