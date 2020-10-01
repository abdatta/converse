import express from 'express';
import { Server } from 'http';
import socketIO from 'socket.io';
import fs from 'fs';

const app = express();

const server = new Server(app);

const io = socketIO(server);

const port = process.env.PORT || 3600;

const logger = console.log;
console.log = (...logs) => logger('[' + new Date() + ']', ...logs);

const store = fs.createWriteStream('store.db',  {flags: 'a'});

class TwoWayMap<K, V> extends Map<K, V> {
    getKey = (v: V) => Array.from(this.entries()).filter(([key, val]) => val === v).map(([key]) => key);
}

interface Message {
    message: string;
    username: string;
    user_id: string;
    timestamp: number;
}

store.on('open', () => {

    const init_msg = JSON.stringify({
        message: 'Hi! This is a global chat forum. I\'m your host Yakubo. Please enjoy chatting here.',
        username: 'Yakubo',
        user_id: '#00001',
        timestamp: Date.now()
    });

    let fromStore = fs.readFileSync('store.db', 'utf8');
    // Adds a comma at front if absent, ignores if store is empty
    if (fromStore && !fromStore.startsWith(',')) {
        fromStore = ',\n' + fromStore;
    }
    let messages: Message[] = JSON.parse('[' + init_msg + fromStore + ']');
    const msg_limit = 300;
    if (messages.length > msg_limit) { messages = messages.splice(-msg_limit); }
    const pushMessage = (msg: Message) => {
        messages.push(msg);
        if (messages.length > msg_limit) {
            messages.shift();
        }
    };

    const onlines: string[] = [];
    const onlineTimeouts: {[k: string]: NodeJS.Timeout} = {};
    const typers: string[] = [];
    const typeTimeouts: {[k: string]: NodeJS.Timeout} = {};

    // Maps socket.id => user_id
    const vc_users = new TwoWayMap<string, string>();

    io.on('connection', (socket) => {
        console.log('New User Connected.');

        // Messages
        io.emit('old-messages', messages);

        socket.on('new-message', (message: Message) => {
            message.timestamp = Date.now();
            store.write(',\n' + JSON.stringify(message));
            io.emit('new-message', message);
            pushMessage(message);
            const i = typers.indexOf(message.username);
            if (i !== -1) {
                // console.log(message.username + ' stopped typing.');
                typers.splice(i, 1);
                clearTimeout(typeTimeouts[message.username]);
                delete typeTimeouts[message.username];
                io.emit('typing', typers);
            }
        });

        // Online
        io.emit('online', onlines);

        const onlineTO = (user: string) => () => {
            const i = onlines.indexOf(user);
            if (i !== -1) {
                console.log(user + ' went offline.');
                onlines.splice(i, 1);
            }
            io.emit('online', onlines);
        };

        socket.on('online', (user: string) => {
            const i = onlines.indexOf(user);
            if (i === -1) {
                console.log(user + ' is online.');
                onlines.push(user);
                onlineTimeouts[user] = setTimeout(onlineTO(user), 4000);
            } else {
                clearTimeout(onlineTimeouts[user]);
                onlineTimeouts[user] = setTimeout(onlineTO(user), 4000);
            }
            io.emit('online', onlines);
        });

        // Typing
        io.emit('typing', typers);

        const to = (typer: string) => () => {
            const i = typers.indexOf(typer);
            if (i !== -1) {
                // console.log(typer + ' stopped typing.');
                typers.splice(i, 1);
            }
            io.emit('typing', typers);
        };

        socket.on('typing', (typer: string) => {
            // console.log(typer + ' is typing...');
            const i = typers.indexOf(typer);
            if (i === -1) {
                typers.push(typer);
                typeTimeouts[typer] = setTimeout(to(typer), 3000);
            } else {
                clearTimeout(typeTimeouts[typer]);
                typeTimeouts[typer] = setTimeout(to(typer), 3000);
            }
            io.emit('typing', typers);
        });

        // Voice events
        socket.on('join-vc', (user: string) => {
            console.log('join-vc', user, Object.fromEntries(vc_users.entries()));
            const existing = vc_users.getKey(user);
            if (existing.length) {
                io.emit('user-left', user);
                existing.forEach(sid => vc_users.delete(sid));
            }
            socket.emit('vc-users', Array.from(vc_users.values()));
            vc_users.set(socket.id, user);
        });

        socket.on('initiate-signal', ({ peerID, signal }) => {
            if (!vc_users.has(socket.id)) { return; }
            const initiatorID = vc_users.get(socket.id);
            console.log('initiate-signal', ({ peerID, initiatorID }));
            if (!vc_users.getKey(peerID).length) { return console.log('Peer not in VC!'); }
            io.to(vc_users.getKey(peerID)[0]).emit('user-joined', { signal, initiatorID });
        });

        socket.on('return-signal', ({ initiatorID, signal }) => {
            if (!vc_users.has(socket.id)) { return; }
            const peerID = vc_users.get(socket.id);
            console.log('return-signal', ({ initiatorID, peerID }));
            if (!vc_users.getKey(initiatorID).length) { return console.log('Initiator not in VC!'); }
            io.to(vc_users.getKey(initiatorID)[0]).emit('receive-return-signal', { signal, peerID });
        });

        const leaveVC = () => {
            if (!vc_users.has(socket.id)) { return; }
            const user = vc_users.get(socket.id);
            console.log('leave-vc', user);
            vc_users.delete(socket.id);
            io.emit('user-left', user);
        };

        socket.on('leave-vc', leaveVC);
        socket.on('disconnect', leaveVC);
    });

    server.listen(port, () => {
        console.log(`started on port: ${port}`);
    });
});
