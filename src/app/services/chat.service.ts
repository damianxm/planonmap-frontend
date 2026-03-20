import { Injectable, NgZone, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatMessageDto {
  id: string;
  senderId: string;
  senderName: string;
  sessionId: string;
  content: string;
  createdAt: string;
}

export interface MessagesPageDto {
  items: ChatMessageDto[];
  nextCursor: string | null;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly zone = inject(NgZone);
  private connection: signalR.HubConnection | null = null;

  private readonly _message$ = new Subject<ChatMessageDto>();
  private readonly _systemMessage$ = new Subject<string>();
  private readonly _history$ = new Subject<MessagesPageDto>();

  readonly message$ = this._message$.asObservable();
  readonly systemMessage$ = this._systemMessage$.asObservable();
  readonly history$ = this._history$.asObservable();

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) return;

    if (!this.connection) {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(`${environment.apiUrl}/hubs/chat`, { withCredentials: true })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      this.connection.on('ReceiveMessage', (msg: ChatMessageDto) => {
        this.zone.run(() => this._message$.next(msg));
      });

      this.connection.on('ReceiveSystemMessage', (text: string) => {
        this.zone.run(() => this._systemMessage$.next(text));
      });

      this.connection.on('LoadHistory', (page: MessagesPageDto) => {
        this.zone.run(() => this._history$.next(page));
      });
    }

    if (this.connection.state === signalR.HubConnectionState.Disconnected) {
      await this.connection.start();
    }
  }

  async joinSession(sessionId: string): Promise<void> {
    await this.connection?.invoke('JoinSession', sessionId);
  }

  async leaveSession(sessionId: string): Promise<void> {
    await this.connection?.invoke('LeaveSession', sessionId);
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    await this.connection?.invoke('SendMessage', sessionId, content);
  }
}
