import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { Message } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private url = environment.server_url;
  private socket;
  public old_messages: Promise<Message[]>;

  constructor() {
      this.socket = io(this.url);
      this.old_messages = new Promise((resolve) => {
        this.socket.on('old-messages', (message) => {
          resolve(message);
        });
      });
  }

  public sendMessage(message: string, username: string, user_id: string, reply_to?: Message, image?: string) {
    if (reply_to) {
      reply_to = JSON.parse(JSON.stringify(reply_to));
      reply_to.reply_to = undefined;
    }
    this.socket.emit('new-message', { message, username, user_id, reply_to, image });
  }

  public getMessages() {
    return Observable.create((observer) => {
        this.socket.on('new-message', (message) => {
            observer.next(message);
        });
    });
  }

  public sendTyping(username: string) {
    this.socket.emit('typing', username);
  }

  public getTypers() {
    return Observable.create((observer) => {
        this.socket.on('typing', (typers) => {
            observer.next(typers);
        });
    });
  }

  public sendOnline(username: string) {
    this.socket.emit('online', username);
  }

  public getOnline() {
    return Observable.create((observer) => {
        this.socket.on('online', (users) => {
            observer.next(users);
        });
    });
  }
}
