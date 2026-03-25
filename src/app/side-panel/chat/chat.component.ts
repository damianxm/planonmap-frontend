import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  inject,
  signal,
  ChangeDetectionStrategy,
  DestroyRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { take, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChatService, ChatMessageDto } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';

export interface DisplayMessage {
  id: string;
  type: 'chat' | 'system';
  senderName?: string;
  content: string;
  createdAt: Date;
  own?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnChanges, OnDestroy, AfterViewChecked {
  @Input() sessionId = '';

  @ViewChild('messagesEnd') private messagesEnd!: ElementRef<HTMLDivElement>;

  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly messages = signal<DisplayMessage[]>([]);
  readonly sendCooldown = signal(false);
  messageInput = '';
  private shouldScroll = false;
  private currentUserId = '';
  private currentSessionId = '';

  constructor() {
    this.authService.getMe().pipe(take(1)).subscribe(me => {
      this.currentUserId = me.anonymousId;
    });

    this.chatService.message$.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(msg => this.onMessage(msg));

    this.chatService.systemMessage$.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(text => this.onSystemMessage(text));

    this.chatService.history$.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(page => this.onHistory(page.items));
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (!changes['sessionId']) return;

    const prev = changes['sessionId'].previousValue as string | undefined;
    const next = changes['sessionId'].currentValue as string;

    if (prev) {
      await this.chatService.leaveSession(prev);
    }

    if (!next) return;

    this.messages.set([]);
    await this.chatService.connect();
    await this.chatService.joinSession(next);
    this.currentSessionId = next;
  }

  async ngOnDestroy(): Promise<void> {
    if (this.currentSessionId) {
      await this.chatService.leaveSession(this.currentSessionId);
    }
  }

  async sendMessage(): Promise<void> {
    const text = this.messageInput.trim();
    if (!text || !this.currentSessionId || this.sendCooldown()) return;
    this.messageInput = '';
    this.sendCooldown.set(true);
    timer(1000).pipe(take(1)).subscribe(() => this.sendCooldown.set(false));
    await this.chatService.sendMessage(this.currentSessionId, text);
  }

  avatarLetter(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.messagesEnd?.nativeElement.scrollIntoView({ behavior: 'smooth' });
      this.shouldScroll = false;
    }
  }

  private onMessage(dto: ChatMessageDto): void {
    this.shouldScroll = true;
    this.messages.update(msgs => [...msgs, {
      id: dto.id,
      type: 'chat',
      senderName: dto.senderName,
      content: dto.content,
      createdAt: new Date(dto.createdAt),
      own: dto.senderId === this.currentUserId
    }]);
  }

  private onSystemMessage(text: string): void {
    this.shouldScroll = true;
    this.messages.update(msgs => [...msgs, {
      id: crypto.randomUUID(),
      type: 'system',
      content: text,
      createdAt: new Date()
    }]);
  }

  private onHistory(items: ChatMessageDto[]): void {
    this.authService.getMe().pipe(take(1)).subscribe(me => {
      this.shouldScroll = true;
      this.messages.set(items.map(dto => ({
        id: dto.id,
        type: 'chat' as const,
        senderName: dto.senderName,
        content: dto.content,
        createdAt: new Date(dto.createdAt),
        own: dto.senderId === me.anonymousId
      })));
    });
  }
}
