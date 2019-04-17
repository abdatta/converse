import { Component } from '@angular/core';
import { ChatService } from './services/chat.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'converse';
  message: string;

  constructor(private chatService: ChatService) {}

  sendMessage() {
    this.chatService.sendMessage(this.message);
    this.message = '';
  }
}
