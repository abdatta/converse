import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ChatService } from './services/chat.service';
import { MatDialog } from '@angular/material';
import { CookieService } from 'ngx-cookie-service';
import { Howl, Howler } from 'howler';
import { LoginComponent } from './login/login.component';
import { Message } from './models/message.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Converse';
  username: string;
  user_id: string;
  message: string;
  messages: Message[] = [];
  alert: Howl;
  typing: boolean;
  typers = '';
  @ViewChild('chats') chatContainer: ElementRef;
  @ViewChild('msg') messageContainer: ElementRef;

  constructor(private chatService: ChatService,
              private cookieService: CookieService,
              public dialog: MatDialog) {
    this.alert = new Howl({
      src: ['/assets/sound.mp3']
    });
    if (!(this.cookieService.check('username') && this.cookieService.check('user_id'))) {
      this.login();
    } else {
      this.username = this.cookieService.get('username');
      this.user_id = this.cookieService.get('user_id');
      this.cookieService.set('username', this.username, 10);
      this.cookieService.set('user_id', this.user_id, 10);
    }
    this.chatService.old_messages
        .then(messages => {
          this.messages.unshift(...messages);
          setTimeout(() =>
            this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight,
            10);
        });
  }

  ngOnInit() {
    this.chatService
      .getMessages()
      .subscribe((message: Message) => {
        this.messages.push(message);
        if (message.user_id !== this.user_id) {
          this.alert.play();
        }
        setTimeout(() =>
          this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight,
          10);
      });
    this.chatService
      .getTypers()
      .subscribe((typers: string[]) => {
        if (typers.includes(this.username)) {
          typers.splice(typers.indexOf(this.username), 1);
        }
        if (typers.length === 0) {
          this.typers = '';
        } else if (typers.length === 1) {
          this.typers = typers[0] + ' is typing...';
        } else {
          this.typers = typers.join(', ') + ' are typing...';
        }
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
      this.cookieService.set('username', this.username, 10);
      this.cookieService.set('user_id', this.user_id, 10);
      this.messageContainer.nativeElement.focus();
    });
  }

  sendTyping(event) {
    if (event.key === 'Enter') {
      this.typing = false;
    } else if (!this.typing) {
      this.typing = true;
      this.chatService.sendTyping(this.username);
      setTimeout(() => this.typing = false, 1000);
    }
  }

  sendMessage() {
    if (!this.isLoggedIn()) {
      this.login();
      return;
    }
    if (this.message.trim() === '') {
      return;
    }
    this.chatService.sendMessage(this.message, this.username, this.user_id);
    this.message = '';
  }

  logout() {
    this.cookieService.delete('username');
    this.cookieService.delete('user_id');
    this.username = '';
    this.user_id = '';
    this.login();
  }
}
