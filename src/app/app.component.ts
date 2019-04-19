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
  onlines = '';
  @ViewChild('chats') chatContainer: ElementRef;
  @ViewChild('msg') messageContainer: ElementRef;

  seeing = true;
  replyingTo: Message;
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
      if (this.user_id.length < 7) {
        this.user_id = this.generateRandomColor();
      }
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
    // Online notifier
    setInterval(() => {
      if (this.isLoggedIn() && this.seeing) {
        this.chatService.sendOnline(this.username);
      }
    }, 2000);

    // Fetch messages
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

    // Fetch Onlines
    this.chatService
      .getOnline()
      .subscribe((users: string[]) => {
        if (users.includes(this.username)) {
          users.splice(users.indexOf(this.username), 1);
        }
        if (users.length === 0) {
          this.onlines = 'No online users';
        } else if (users.length === 1) {
          this.onlines = users[0] + ' is online';
        } else {
          this.onlines = users.join(', ') + ' are online';
        }
      });

    // Fetch Typers
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

  @OnPageVisibilityChange()
  logWhenPageVisibilityChange(visibilityState: AngularPageVisibilityStateEnum ) {
       this.seeing = (AngularPageVisibilityStateEnum[visibilityState]
        === AngularPageVisibilityStateEnum[AngularPageVisibilityStateEnum.VISIBLE]);
      if (this.seeing) {
        this.unread = 0;
        this.titleService.setTitle(`Converse`);
      }
  }

  formatDate(date: number) {
    if (moment(date).isSame(moment(), 'D')) {
      return moment(date).format('HH:mm:ss');
    }
    return moment(date).format('DD MMM, HH:mm:ss');
  }

  getColor(id: string) {
    if (id === this.user_id) {
      return '#69f0ae'; // bright green accent color
    }
    if (id.length < 7) {
      return '#7b1fa2';
    }
    return id;
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
      this.user_id = this.generateRandomColor();
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

  setReply(message: Message) {
    this.replyingTo = message;
  }

  logout() {
    this.cookieService.delete('username');
    this.cookieService.delete('user_id');
    this.username = '';
    this.user_id = '';
    this.login();
  }

  generateRandomColor() {
    const h = 256 * Math.random(),
          s = (45 + 30 * Math.random()) / 100,
          l = (35 + 30 * Math.random()) / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s,
          x = c * (1 - Math.abs((h / 60) % 2 - 1)),
          m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }
    // Having obtained RGB, convert channels to hex
    let hr = Math.round((r + m) * 255).toString(16),
        hg = Math.round((g + m) * 255).toString(16),
        hb = Math.round((b + m) * 255).toString(16);

    // Prepend 0s, if necessary
    hr = (hr.length === 1) ? '0' + hr : hr;
    hg = (hg.length === 1) ? '0' + hg : hg;
    hb = (hb.length === 1) ? '0' + hb : hb;

    return '#' + hr + hg + hb;
  }
}
