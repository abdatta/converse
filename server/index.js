let express = require('express')
let app = express();

let http = require('http');
let server = http.Server(app);

let socketIO = require('socket.io');
let io = socketIO(server);

const port = process.env.PORT || 3600;

const logger = console.log;
console.log = (...logs) => logger('[' + new Date() + ']', ...logs);

let fs = require('fs');
let store = fs.createWriteStream('store.db',  {flags:'a'});

const init_msg = JSON.stringify({
    message: 'Hi! This is a global chat forum. I\'m your host Yakubo. Please enjoy chatting here.',
    username: 'Yakubo',
    user_id: '#00001',
    timestamp: Date.now()
});

let messages = JSON.parse('[' + init_msg + fs.readFileSync('store.db', 'utf8') + ']');
const msg_limit = 300;
if (messages.length > msg_limit) messages = messages.splice(-msg_limit);
const pushMessage = (msg) => {
    messages.push(msg);
    if (messages.length > msg_limit)
        messages.shift();
}

let onlines = [];
let onlineTimeouts = {};
let typers = [];
let typeTimeouts = {};

io.on('connection', (socket) => {
    console.log('New User Connected.');

    // Messages
    io.emit('old-messages', messages);

    socket.on('new-message', (message) => {
        message.timestamp = Date.now();
        store.write(',\n' + JSON.stringify(message));
        io.emit('new-message', message);
        pushMessage(message);
        const i = typers.indexOf(message.username);
        if (i !== -1) {
            // console.log(message.username + ' stopped typing.');
            typers.splice(i, 1);
            clearTimeout(typeTimeouts[message.username]);
            typeTimeouts[message.username] = undefined;
            io.emit('typing', typers);
        }
    });

    // Online
    io.emit('online', onlines);

    const onlineTO = (user) => () => {
        const i = onlines.indexOf(user);
        if (i !== -1) {
            console.log(user + ' went offline.');
            onlines.splice(i, 1);
        }
        io.emit('online', onlines);
    }

    socket.on('online', (user) => {
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

    const to = (typer) => () => {
        const i = typers.indexOf(typer);
        if (i !== -1) {
            // console.log(typer + ' stopped typing.');
            typers.splice(i, 1);
        }
        io.emit('typing', typers);
    }

    socket.on('typing', (typer) => {
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
});

server.listen(port, () => {
    console.log(`started on port: ${port}`);
});