import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SessionDto {
  id: string;
  code: string;
  name: string;
  createdAt: string;
}

export interface ParticipantDto {
  userId: string;
  displayName: string;
  joinedAt: string;
  isHost: boolean;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/sessions`;

  createSession(name: string, displayName?: string): Observable<SessionDto> {
    return this.http.post<SessionDto>(this.baseUrl, { name, displayName }, { withCredentials: true });
  }

  getSessionById(id: string): Observable<SessionDto> {
    return this.http.get<SessionDto>(`${this.baseUrl}/${id}`, { withCredentials: true });
  }

  getSessionByCode(code: string): Observable<SessionDto> {
    return this.http.get<SessionDto>(`${this.baseUrl}/by-code/${code}`, { withCredentials: true });
  }

  getParticipants(sessionId: string): Observable<ParticipantDto[]> {
    return this.http.get<ParticipantDto[]>(
      `${this.baseUrl}/${sessionId}/participants`,
      { withCredentials: true }
    );
  }

  joinSession(sessionId: string, displayName?: string): Observable<ParticipantDto[]> {
    return this.http.post<ParticipantDto[]>(
      `${this.baseUrl}/${sessionId}/participants`,
      { displayName },
      { withCredentials: true }
    );
  }

  leaveSession(sessionId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${sessionId}/participants`,
      { withCredentials: true }
    );
  }
}
