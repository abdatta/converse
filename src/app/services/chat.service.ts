import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private url = 'http://localhost:3000';
  private socket;

  constructor() {
      this.socket = io(this.url);
  }

  public sendMessage(message: string) {
    this.socket.emit('new-message', message);
  }

  public getMessages() {
    return Observable.create((observer) => {
        this.socket.on('new-message', (message) => {
            observer.next(message);
        });
    });
  }
}
