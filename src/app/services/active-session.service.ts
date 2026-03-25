import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SessionService, ParticipantDto } from './session.service';
import { ChatService } from './chat.service';

const STORAGE_KEY = 'infomap_session_id';

@Injectable({ providedIn: 'root' })
export class ActiveSessionService {
  private readonly sessionService = inject(SessionService);
  private readonly chatService = inject(ChatService);

  readonly sessionId = signal('');
  readonly sessionCode = signal('');
  readonly sessionName = signal('');
  readonly participants = signal<ParticipantDto[]>([]);
  readonly isRestoring = signal(false);
  readonly isExpired = signal(false);

  constructor() {
    this.tryRestore();

    this.chatService.systemMessage$.subscribe(() => {
      const id = this.sessionId();
      if (id) {
        this.sessionService.getParticipants(id).subscribe(p => this.participants.set(p));
      }
    });
  }

  async create(name: string, displayName: string): Promise<void> {
    const session = await firstValueFrom(
      this.sessionService.createSession(name, displayName)
    );
    const participants = await firstValueFrom(
      this.sessionService.getParticipants(session.id)
    );
    this.sessionId.set(session.id);
    this.sessionCode.set(session.code);
    this.sessionName.set(session.name);
    this.participants.set(participants);
    localStorage.setItem(STORAGE_KEY, session.id);
  }

  async join(code: string, displayName: string): Promise<void> {
    const session = await firstValueFrom(this.sessionService.getSessionByCode(code));
    const participants = await firstValueFrom(
      this.sessionService.joinSession(session.id, displayName)
    );
    this.sessionId.set(session.id);
    this.sessionCode.set(session.code);
    this.sessionName.set(session.name);
    this.participants.set(participants);
    localStorage.setItem(STORAGE_KEY, session.id);
  }

  leave(): void {
    const id = this.sessionId();
    if (id) {
      this.sessionService.leaveSession(id).subscribe();
    }
    this.sessionId.set('');
    this.sessionCode.set('');
    this.sessionName.set('');
    this.participants.set([]);
    this.isExpired.set(false);
    localStorage.removeItem(STORAGE_KEY);
  }

  clearExpired(): void {
    this.isExpired.set(false);
  }

  private async tryRestore(): Promise<void> {
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (!storedId) return;

    this.isRestoring.set(true);
    try {
      const [session, participants] = await Promise.all([
        firstValueFrom(this.sessionService.getSessionById(storedId)),
        firstValueFrom(this.sessionService.joinSession(storedId))
      ]);
      this.sessionId.set(storedId);
      this.sessionCode.set(session.code);
      this.sessionName.set(session.name);
      this.participants.set(participants);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      this.isExpired.set(true);
    } finally {
      this.isRestoring.set(false);
    }
  }
}
