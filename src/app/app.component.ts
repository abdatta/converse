import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ChatService } from './services/chat.service';
import { MatDialog } from '@angular/material';
import { LoginComponent } from './login/login.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'converse';
  username: string;
  user_id: string;
  message: string;
  messages: string[] = [];
  @ViewChild('chats') chatContainer: ElementRef;
  @ViewChild('msg') messageContainer: ElementRef;

  constructor(private chatService: ChatService,
              public dialog: MatDialog) {}

  ngOnInit() {
    if (!this.isLoggedIn()) {
      this.login();
    }
    this.chatService
      .getMessages()
      .subscribe((message: string) => {
        this.messages.push(message);
        setTimeout(() =>
          this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight,
          10);
      });
  }

  isLoggedIn() {
    return (this.username && this.user_id);
  }

  login() {
    const dialogRef = this.dialog.open(LoginComponent, {
      width: '500px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(username => {
      this.username = username;
      this.user_id = '#' + Math.ceil(Math.random() * 100000);
      this.messageContainer.nativeElement.focus();
    });
  }

  sendMessage() {
    if (!this.isLoggedIn()) {
      this.login();
      return;
    }
    if (this.message.trim() === '') {
      return;
    }
    this.chatService.sendMessage(this.message);
    this.message = '';
  }
}
