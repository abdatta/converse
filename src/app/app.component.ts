import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ChatService } from './services/chat.service';
import { MatDialog } from '@angular/material';
import { CookieService } from 'ngx-cookie-service';
import { OnPageVisibilityChange, AngularPageVisibilityStateEnum } from 'angular-page-visibility';
import { Howl } from 'howler';
import * as moment from 'moment';
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

  seeing = true;
  unread = 0;

  constructor(private chatService: ChatService,
              private titleService: Title,
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
        if (!this.seeing) {
          this.unread++;
          this.titleService.setTitle(`(${this.unread}) Converse`);
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

  formatDate(date: number) {
    if (moment(date).isSame(moment(), 'D')) {
      return moment(date).format('HH:mm');
    }
    return moment(date).format('DD MMM, HH:mm');
  }

  @OnPageVisibilityChange()
  logWhenPageVisibilityChange(visibilityState: AngularPageVisibilityStateEnum ) {
       this.seeing = (AngularPageVisibilityStateEnum[visibilityState]
        === AngularPageVisibilityStateEnum[AngularPageVisibilityStateEnum.VISIBLE]);
      if (this.seeing) {
        this.unread = 0;
        this.titleService.setTitle(`Converse`);
      }
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
