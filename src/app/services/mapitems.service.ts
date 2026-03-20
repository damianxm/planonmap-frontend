import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MarkerDto {
  id: number;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  sessionId: string;
}

@Injectable({ providedIn: 'root' })
export class MapItemsService {
  private connection: signalR.HubConnection | null = null;

  private _marker$ = new Subject<MarkerDto>();
  private _markers$ = new Subject<MarkerDto[]>();

  readonly marker$: Observable<MarkerDto> = this._marker$.asObservable();
  readonly markers$: Observable<MarkerDto[]> = this._markers$.asObservable();

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) return;

    if (!this.connection) {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(`${environment.apiUrl}/hubs/mapitems`, { withCredentials: true })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      this.connection.on('ReceiveMarker', (marker: MarkerDto) => this._marker$.next(marker));
      this.connection.on('LoadMarkers', (markers: MarkerDto[]) => this._markers$.next(markers));
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

  async addMarker(sessionId: string, name: string, description: string | null, latitude: number, longitude: number): Promise<void> {
    await this.connection?.invoke('AddMarker', sessionId, name, description, latitude, longitude);
  }
}
