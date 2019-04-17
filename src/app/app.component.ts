import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ChatService } from './services/chat.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'converse';
  message: string;
  messages: string[] = [];
  @ViewChild('chats') chatContainer: ElementRef;

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    this.chatService
      .getMessages()
      .subscribe((message: string) => {
        this.messages.push(message);
        setTimeout(() =>
          this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight,
          10);
      });
  }

  sendMessage() {
    if (this.message.trim() === '') {
      return;
    }
    this.chatService.sendMessage(this.message);
    this.message = '';
  }
}
