import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserDto {
  anonymousId: string;
  displayName: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private me$: Observable<UserDto> | null = null;

  getMe(): Observable<UserDto> {
    this.me$ ??= this.http
      .get<UserDto>(`${environment.apiUrl}/api/v1/auth/user`, { withCredentials: true })
      .pipe(shareReplay(1));
    return this.me$;
  }
}
