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
  ChangeDetectorRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Subscription, take } from 'rxjs';
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
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnChanges, OnDestroy, AfterViewChecked {
  @Input() sessionId = '';
  @Input() userName = '';

  @ViewChild('messagesEnd') private messagesEnd!: ElementRef<HTMLDivElement>;

  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  messages: DisplayMessage[] = [];
  messageInput = '';
  sendCooldown = false;
  private shouldScroll = false;
  private currentUserId = '';
  private currentSessionId = '';
  private readonly subs = new Subscription();

  constructor() {
    this.authService.getMe().pipe(take(1)).subscribe(me => {
      this.currentUserId = me.anonymousId;
    });

    this.subs.add(
      this.chatService.message$.subscribe(msg => this.onMessage(msg))
    );
    this.subs.add(
      this.chatService.systemMessage$.subscribe(text => this.onSystemMessage(text))
    );
    this.subs.add(
      this.chatService.history$.subscribe(page => this.onHistory(page.items))
    );
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (!changes['sessionId']) return;

    const prev = changes['sessionId'].previousValue as string | undefined;
    const next = changes['sessionId'].currentValue as string;

    if (prev) {
      await this.chatService.leaveSession(prev);
    }

    if (!next) return;

    this.messages = [];
    await this.chatService.connect();
    await this.chatService.joinSession(next);
    this.currentSessionId = next;
  }

  async ngOnDestroy(): Promise<void> {
    this.subs.unsubscribe();
    if (this.currentSessionId) {
      await this.chatService.leaveSession(this.currentSessionId);
    }
  }

  async sendMessage(): Promise<void> {
    const text = this.messageInput.trim();
    if (!text || !this.currentSessionId || this.sendCooldown) return;
    this.messageInput = '';
    this.sendCooldown = true;
    setTimeout(() => {
      this.sendCooldown = false;
      this.cdr.detectChanges();
    }, 1000);
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
    this.messages.push({
      id: dto.id,
      type: 'chat',
      senderName: dto.senderName,
      content: dto.content,
      createdAt: new Date(dto.createdAt),
      own: dto.senderId === this.currentUserId
    });
    this.shouldScroll = true;
    this.cdr.detectChanges();
  }

  private onSystemMessage(text: string): void {
    this.messages.push({
      id: crypto.randomUUID(),
      type: 'system',
      content: text,
      createdAt: new Date()
    });
    this.shouldScroll = true;
    this.cdr.detectChanges();
  }

  private onHistory(items: ChatMessageDto[]): void {
    this.authService.getMe().pipe(take(1)).subscribe(me => {
      this.messages = items.map(dto => ({
        id: dto.id,
        type: 'chat' as const,
        senderName: dto.senderName,
        content: dto.content,
        createdAt: new Date(dto.createdAt),
        own: dto.senderId === me.anonymousId
      }));
      this.shouldScroll = true;
      this.cdr.detectChanges();
    });
  }
}
