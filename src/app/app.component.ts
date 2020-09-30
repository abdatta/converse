import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ChatService } from './services/chat.service';
import { MatDialog } from '@angular/material/dialog';
import { CookieService } from 'ngx-cookie-service';
import { OnPageVisibilityChange, AngularPageVisibilityStateEnum } from 'angular-page-visibility';
import { Howl } from 'howler';
import * as moment from 'moment';
import { LoginComponent } from './login/login.component';
import { Message } from './models/message.model';
import { ImageComponent } from './image/image.component';
import { Instance } from 'simple-peer';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Converse';
  username: string;
  user_id: string;
  message = '';
  messages: Message[] = [];
  alert: Howl;
  typing: boolean;
  typers = '';
  onlines = '';
  @ViewChild('chats', { static: true }) chatContainer: ElementRef;
  @ViewChild('msg', { static: true }) messageContainer: ElementRef;

  seeing = true;
  replyingTo: Message;
  uploadProgress: number;
  image: string;
  unread = 0;
  show_secs = false;

  // VC properties
  voice_joined = false;
  private _stream: MediaStream;
  vc_users = new Map<string, {
    peer: Instance;
    onConnect: Observable<boolean>;
    onStream: Observable<MediaStream>;
  } | null>();

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

    this.show_secs = this.cookieService.get('show_seconds') === 'true';
    this.cookieService.set('show_seconds', `${this.show_secs}`, 10);

    this.chatService.old_messages
        .then(messages => {
          this.messages.unshift(...messages);
          setTimeout(() =>
            this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight,
            10);
        });
    this.addNewVoiceUser();
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
      .subscribe(message => {
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
      .subscribe(users => {
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
      .subscribe(typers => {
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

  toggleShowSec() {
    this.show_secs = !this.show_secs;
    this.cookieService.set('show_seconds', `${this.show_secs}`, 10);
  }

  formatDate(date: number) {
    const format = this.show_secs ? 'HH:mm:ss' : 'HH:mm';
    if (moment(date).isSame(moment(), 'D')) {
      return moment(date).format(format);
    }
    if (moment(date).isSame(moment().subtract(1, 'days'), 'D')) {
      return 'Yesterday, ' + moment(date).format(format);
    }
    return moment(date).format('DD MMM, ' + format);
  }

  getColor(id: string) {
    if (id === this.user_id) {
      return '#69f0ae'; // bright green accent color
    }
    if (/^#[0-9a-f]{6}/i.test(id)) {
      return id;
    }
    return '#7b1fa2';
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
    if (this.message.trim() === '' && !this.image) {
      return;
    }
    if (this.message.length > 1000) {
      this.message = this.message.substring(0, 1000);
    }
    this.chatService.sendMessage(this.message, this.username, this.user_id, this.replyingTo, this.image);
    this.replyingTo = undefined;
    this.image = '';
    this.message = '';
  }

  quoteReply(msg: Message) {
    this.replyingTo = msg;
    this.messageContainer.nativeElement.focus();
  }

  uploadingImage(progress) {
    this.uploadProgress = progress;
  }

  attachImage(url) {
    this.image = url;
    this.uploadProgress = undefined;
  }

  showImage(url: string) {
    this.dialog.open(ImageComponent, {
      panelClass: 'full-image',
      data: url
    });
  }

  loadedImage() {
    this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
  }

  getLowQualityImage(url: string) {
    return url.replace(/upload\/v[0-9]*\//, 'upload/q_auto:low/');
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

  // VC functions
  async getAudioStream() {
    if (this._stream) {
      return this._stream;
    }
    const getStream = () => {
      const constraints = { audio: true };
      if (navigator.mediaDevices.getUserMedia) {
        return navigator.mediaDevices.getUserMedia(constraints);
      }
      navigator.getUserMedia = navigator.getUserMedia || navigator['webkitGetUserMedia'] ||
                              navigator['mozGetUserMedia'] || navigator['msGetUserMedia'];
      return new Promise<MediaStream>((resolve, reject) => navigator.getUserMedia(constraints, resolve, reject));
    };
    return this._stream = await getStream();
  }

  async joinVC() {
    if (this.voice_joined) {
      return;
    }
    const stream = await this.getAudioStream();
    this.chatService.joinVoice(this.user_id).subscribe(users => {
      this.voice_joined = true;
      this.vc_users = new Map();
      users.forEach(userID => this.vc_users.set(userID, this.chatService.createPeer(userID, stream)));
    });
  }

  async addNewVoiceUser() {
    this.chatService.newVoiceUser()
      .subscribe(async ({initiatorID, signal}) => {
        console.log('user-joined', {initiatorID, signal});
        if (this.vc_users.has(initiatorID)) {
          console.log('Initiator vc_user already exists with id:', initiatorID);
          return;
        }
        const stream = await this.getAudioStream();
        this.vc_users.set(initiatorID, this.chatService.addPeer(signal, initiatorID, stream));
      });
  }
}
