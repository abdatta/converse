import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { environment } from '../../environments/environment';
import { fromEvent } from 'rxjs';
import { Message } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private url = environment.server_url;
  private socket = io(this.url);
  public old_messages = new Promise<Message[]>(resolve => this.socket.on('old-messages', resolve));

  constructor() {
  }

  public sendMessage(message: string, username: string, user_id: string, reply_to?: Message, image?: string) {
    if (reply_to) {
      reply_to = JSON.parse(JSON.stringify(reply_to));
      reply_to.reply_to = undefined;
    }
    this.socket.emit('new-message', { message, username, user_id, reply_to, image });
  }

  public getMessages() {
    return fromEvent<Message>(this.socket, 'new-message');
  }

  public sendTyping(username: string) {
    this.socket.emit('typing', username);
  }

  public getTypers() {
    return fromEvent<string[]>(this.socket, 'typing');
  }

  public sendOnline(username: string) {
    this.socket.emit('online', username);
  }

  public getOnline() {
    return fromEvent<string[]>(this.socket, 'online');
  }
}
