import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { environment } from '../../environments/environment';
import { fromEvent, Observable } from 'rxjs';
import { first, share, filter, tap, mapTo } from 'rxjs/operators';
import { Message, User } from '../models/message.model';
import * as SimplePeer from 'simple-peer';
import { SignalData } from 'simple-peer';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private url = environment.server_url;
  private socket = io(this.url);
  public old_messages = new Promise<Message[]>(resolve => this.socket.on('old-messages', resolve));

  private receiveReturnSignal = fromEvent<{ signal: SignalData, peer: User }>(this.socket, 'receive-return-signal').pipe(share());

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

  // Voice events
  public getVoiceUsers() {
    return fromEvent<User[]>(this.socket, 'vc-users');
  }

  public joinVoice(user_id: string, username: string) {
    this.socket.emit('join-vc', { user_id, username });
    return fromEvent<User[]>(this.socket, 'joined-vc').pipe(first());
  }

  public newVoiceUserConnecting() {
    return fromEvent<{ signal: SignalData, initiator: User }>(this.socket, 'user-connecting');
  }

  public leaveVoice() {
    this.socket.emit('leave-vc');
  }

  public createPeer(peer: User, stream: MediaStream) {
    const peerConnection = new SimplePeer({
        initiator: true,
        trickle: false,
        stream
    });

    peerConnection.on('signal', (signal: SignalData) => {
        console.log('initiate-signal', { peer, signal });
        this.socket.emit('initiate-signal', { peer, signal });
    });

    peerConnection.on('close', () => console.log('Connection closed for peer: ' + peer.username));

    this.receiveReturnSignal
      .pipe(filter(({ peer: { user_id } }) => user_id === peer.user_id), first())
      .subscribe(({ signal }) => {
        console.log('Signaling initiator signal:', { signal });
        peerConnection.signal(signal);
      });

    return {
      connection: peerConnection,
      onConnect: fromEvent<void>(peerConnection, 'connect')
        .pipe(tap(() => console.log('Connected to existing peer!')), mapTo(true), share()),
      onStream: fromEvent<MediaStream>(peerConnection, 'stream')
        .pipe(tap((s) => console.log('stream from existing peer', s)), share())
    } as PeerConnection;
  }

  public addPeer(incomingSignal: SignalData, initiator: User, stream: MediaStream) {
    const peerConnection = new SimplePeer({
        initiator: false,
        trickle: false,
        stream,
    });

    peerConnection.on('signal', signal => {
        if (signal.renegotiate) {
          console.log('Not renogotiating', { signal });
          return;
        }
        console.log('return-signal', { initiator, signal });
        this.socket.emit('return-signal', { initiator, signal });
    });

    peerConnection.on('close', () => console.log('Connection closed for peer: ' + initiator.username));

    console.log('Signaling incoming signal:', { incomingSignal });
    peerConnection.signal(incomingSignal);

    return {
      connection: peerConnection,
      onConnect: fromEvent<void>(peerConnection, 'connect')
        .pipe(tap(() => console.log('Connected to new peer!')), mapTo(true), share()),
      onStream: fromEvent<MediaStream>(peerConnection, 'stream')
        .pipe(tap((s) => console.log('stream from new peer', s)), share())
    } as PeerConnection;
  }
}

export interface PeerConnection {
  connection: SimplePeer.Instance;
  onConnect: Observable<boolean>;
  onStream: Observable<MediaStream>;
}
