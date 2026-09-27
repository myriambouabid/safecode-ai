export interface AuditRequest {
  repoUrl: string;
}

export interface Finding {
  id: string;
  category: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  file: string;
  line: number;
  issue: string;
  evidence: string;
  fix: string;
  // populated after AI fix
  fixedCode?: string;
  originalCode?: string;
  fixed?: boolean;
}

export interface AuditResponse {
  score: number;
  findingsCount: number;
  findings: Finding[];
  auditId?: number;
}

export interface FixResponse {
  findingId: string;
  fixedCode: string;
  originalCode: string;
  scoreAfter?: number;
}
