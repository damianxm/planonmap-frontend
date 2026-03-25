import { Component, signal, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MapComponent, MapClickEvent } from './map/map.component';
import { SidePanelComponent } from './side-panel/side-panel.component';
import { BottomPanelComponent } from './bottom-panel/bottom-panel.component';
import { ActiveSessionService } from './services/active-session.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MapComponent, SidePanelComponent, BottomPanelComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly activeSession = inject(ActiveSessionService);
  pendingCoords = signal<MapClickEvent | null>(null);
  panelOpen = signal(false);
  cookieNoticeVisible = signal(!localStorage.getItem('infomap_cookie_ok'));

  constructor() {
    effect(() => {
      if (this.activeSession.sessionId()) {
        this.panelOpen.set(true);
      }
    });
  }

  dismissCookieNotice(): void {
    localStorage.setItem('infomap_cookie_ok', '1');
    this.cookieNoticeVisible.set(false);
  }
}
