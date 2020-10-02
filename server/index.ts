import express from 'express';
import { Server } from 'http';
import socketIO from 'socket.io';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.static(path.join(__dirname, 'converse')));

const server = new Server(app);

const io = socketIO(server);

const port = process.env.PORT || 3600;

const logger = console.log;
console.log = (...logs) => logger('[' + new Date() + ']', ...logs);

const store = fs.createWriteStream('store.db',  {flags: 'a'});

interface User {
    user_id: string;
    username: string;
}

interface Message extends User {
    message: string;
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

    // Maps socket.id => user
    const vc_users = new Map<string, User>();
    const getSocketId = (user_id: string) =>
        Array.from(vc_users.entries()).filter(([sid, user]) => user.user_id === user_id).map(([sid]) => sid);

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
        socket.emit('vc-users', Array.from(vc_users.values()));

        socket.on('join-vc', (user: User) => {
            console.log('join-vc', user, Array.from(vc_users.values()));
            const existing = getSocketId(user.user_id);
            if (existing.length) {
                existing.forEach(sid => vc_users.delete(sid));
            }
            vc_users.set(socket.id, user);
            socket.broadcast.emit('vc-users', Array.from(vc_users.values()));
            socket.emit('joined-vc', Array.from(vc_users.values()));
        });

        socket.on('initiate-signal', (data: { peer: User, signal: any }) => {
            const { peer, signal } = data;
            const initiator = vc_users.get(socket.id);
            if (!initiator) { return; }
            console.log('initiate-signal', ({ peer: peer.username, initiator: initiator.username }));
            if (!getSocketId(peer.user_id).length) { return console.log('Peer not in VC!'); }
            io.to(getSocketId(peer.user_id)[0]).emit('user-connecting', { signal, initiator });
        });

        socket.on('return-signal', (data: { initiator: User, signal: any }) => {
            const { initiator, signal } = data;
            const peer = vc_users.get(socket.id);
            if (!peer) { return; }
            console.log('return-signal', ({ initiator: initiator.username, peer: peer.username }));
            if (!getSocketId(initiator.user_id).length) { return console.log('Initiator not in VC!'); }
            io.to(getSocketId(initiator.user_id)[0]).emit('receive-return-signal', { signal, peer });
        });

        const leaveVC = () => {
            if (!vc_users.has(socket.id)) { return; }
            const user = vc_users.get(socket.id);
            console.log('leave-vc', user);
            vc_users.delete(socket.id);
            io.emit('vc-users', Array.from(vc_users.values()));
        };

        socket.on('leave-vc', leaveVC);
        socket.on('disconnect', leaveVC);
    });

    server.listen(port, () => {
        console.log(`started on port: ${port}`);
    });
});
