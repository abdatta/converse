let express = require('express')
let app = express();

let http = require('http');
let server = http.Server(app);

let socketIO = require('socket.io');
let io = socketIO(server);

const port = process.env.PORT || 3600;

let messages = [];
let typers = [];
let typeTimeouts = {};

io.on('connection', (socket) => {
    console.log('[' + new Date() + ']', 'New User Connected.');

    io.emit('old-messages', messages);
    io.emit('typing', typers);

    socket.on('new-message', (message) => {
        io.emit('new-message', message);
        messages.push(message);
        const i = typers.indexOf(message.username);
        if (i !== -1) {
            console.log(message.username + ' stopped typing.');
            typers.splice(i, 1);
            clearTimeout(typeTimeouts[message.username]);
            typeTimeouts[message.username] = undefined;
            io.emit('typing', typers);
        }
    });

    const to = (typer) => () => {
        const i = typers.indexOf(typer);
        if (i !== -1) {
            console.log(typer + ' stopped typing.');
            typers.splice(i, 1);
        }
        io.emit('typing', typers);
    }

    socket.on('typing', (typer) => {
        console.log(typer + ' is typing...');
        const i = typers.indexOf(typer);
        if (i === -1) {
            typers.push(typer);
            typeTimeouts[typer] = setTimeout(to(typer), 2000);
        } else {
            clearTimeout(typeTimeouts[typer]);
            typeTimeouts[typer] = setTimeout(to(typer), 2000);
        }
        io.emit('typing', typers);
    });
});

server.listen(port, () => {
    console.log(`started on port: ${port}`);
});