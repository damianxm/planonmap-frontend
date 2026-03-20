import { Component, signal, computed, inject, effect, Input, HostBinding } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatComponent } from './chat/chat.component';
import { ActiveSessionService } from '../services/active-session.service';

export enum PanelView {
  Home = 'home',
  CreateForm = 'create-form',
  JoinForm = 'join-form',
  SessionActive = 'session-active',
  SessionExpired = 'session-expired'
}

@Component({
  selector: 'app-side-panel',
  standalone: true,
  imports: [FormsModule, ChatComponent],
  templateUrl: './side-panel.component.html',
  styleUrl: './side-panel.component.scss'
})
export class SidePanelComponent {
  readonly PanelView = PanelView;

  readonly activeSession = inject(ActiveSessionService);

  @Input() mobileOpen = false;
  @HostBinding('class.is-mobile-open') get isMobileOpen() { return this.mobileOpen; }

  currentView = signal<PanelView>(PanelView.Home);
  isLoading = signal(false);
  errorMessage = signal('');

  sessionNameInput = '';
  joinCodeInput = '';
  userNameInput = '';

  isSessionActive = computed(() => this.currentView() === PanelView.SessionActive);

  constructor() {
    effect(() => {
      const id = this.activeSession.sessionId();
      if (id && this.currentView() !== PanelView.SessionActive) {
        this.currentView.set(PanelView.SessionActive);
      } else if (!id && this.currentView() === PanelView.SessionActive) {
        this.currentView.set(PanelView.Home);
      }
    });

    effect(() => {
      if (this.activeSession.isExpired()) {
        this.currentView.set(PanelView.SessionExpired);
      }
    });
  }

  navigateTo(view: PanelView): void {
    this.errorMessage.set('');
    this.currentView.set(view);
  }

  createSession(): void {
    if (!this.sessionNameInput.trim() || !this.userNameInput.trim()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.activeSession.create(this.sessionNameInput.trim(), this.userNameInput.trim())
      .then(() => {
        this.isLoading.set(false);
      })
      .catch(() => {
        this.errorMessage.set('Failed to create session. Please try again.');
        this.isLoading.set(false);
      });
  }

  joinSession(): void {
    if (!this.joinCodeInput.trim() || !this.userNameInput.trim()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.activeSession.join(this.joinCodeInput.trim(), this.userNameInput.trim())
      .then(() => {
        this.isLoading.set(false);
      })
      .catch(() => {
        this.errorMessage.set('Session with this code does not exist.');
        this.isLoading.set(false);
      });
  }

  leaveSession(): void {
    this.sessionNameInput = '';
    this.joinCodeInput = '';
    this.userNameInput = '';
    this.errorMessage.set('');
    this.activeSession.leave();
  }

  goCreateAfterExpiry(): void {
    this.activeSession.clearExpired();
    this.currentView.set(PanelView.CreateForm);
  }

  copyCode(): void {
    navigator.clipboard.writeText(this.activeSession.sessionCode());
  }
}
