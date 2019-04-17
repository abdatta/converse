import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { Observable } from 'rxjs';
import { Message } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private url = 'http://localhost:3000';
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

  public sendMessage(message: string, username: string, user_id: string) {
    this.socket.emit('new-message', { message, username, user_id });
  }

  public getMessages() {
    return Observable.create((observer) => {
        this.socket.on('new-message', (message) => {
            observer.next(message);
        });
    });
  }
}
