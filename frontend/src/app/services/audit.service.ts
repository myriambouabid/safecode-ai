import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuditRequest, AuditResponse, FixResponse } from '../models/audit.model';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly baseUrl = '/api';

  constructor(private http: HttpClient) {}

  runAudit(request: AuditRequest): Observable<AuditResponse> {
    return this.http.post<AuditResponse>(`${this.baseUrl}/audit`, request);
  }

  getAudit(id: number): Observable<AuditResponse> {
    return this.http.get<AuditResponse>(`${this.baseUrl}/audit/${id}`);
  }

  fixVulnerability(auditId: number, findingId: string): Observable<FixResponse> {
    return this.http.post<FixResponse>(`${this.baseUrl}/audit/${auditId}/fix`, { findingId });
  }
}
