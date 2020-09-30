import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { environment } from '../../environments/environment';
import { fromEvent } from 'rxjs';
import { first, share, filter, tap, mapTo } from 'rxjs/operators';
import { Message } from '../models/message.model';
import * as SimplePeer from 'simple-peer';
import { SignalData } from 'simple-peer';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private url = environment.server_url;
  private socket = io(this.url);
  public old_messages = new Promise<Message[]>(resolve => this.socket.on('old-messages', resolve));

  private receiveReturnSignal = fromEvent<{ signal: SignalData, peerID: string }>(this.socket, 'receive-return-signal').pipe(share());

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

  public joinVoice(initiatorID: string) {
    this.socket.emit('join-vc', initiatorID);
    return fromEvent<string[]>(this.socket, 'vc-users').pipe(first());
  }

  public newVoiceUser() {
    return fromEvent<{ signal: SignalData, initiatorID: string }>(this.socket, 'user-joined');
  }

  public createPeer(peerID: string, stream: MediaStream) {
    const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream
    });

    peer.on('signal', (signal: SignalData) => {
        console.log('initiate-signal', { peerID, signal });
        this.socket.emit('initiate-signal', { peerID, signal });
    });

    this.receiveReturnSignal
      .pipe(filter(({ peerID: id }) => id === peerID), first())
      .subscribe(({ signal }) => {
        console.log('Signaling initiator signal:', { signal });
        peer.signal(signal);
      });

    return {
      peer,
      onConnect: fromEvent<void>(peer, 'connect').pipe(tap(() => console.log('Connected to existing peer!')), mapTo(true)),
      onStream: fromEvent<MediaStream>(peer, 'stream').pipe(tap((s) => console.log('stream from existing peer', s)))
    };
  }

  public addPeer(incomingSignal: SignalData, initiatorID: string, stream: MediaStream) {
    const peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream,
    });

    peer.on('signal', signal => {
        if (signal.renegotiate) {
          console.log('Not renogotiating', { signal });
          return;
        }
        console.log('return-signal', { initiatorID, signal });
        this.socket.emit('return-signal', { initiatorID, signal });
    });

    console.log('Signaling incoming signal:', { incomingSignal });
    peer.signal(incomingSignal);

    return {
      peer,
      onConnect: fromEvent<void>(peer, 'connect').pipe(tap(() => console.log('Connected to new peer!')), mapTo(true)),
      onStream: fromEvent<MediaStream>(peer, 'stream').pipe(tap((s) => console.log('stream from new peer', s)))
    };
  }
}
