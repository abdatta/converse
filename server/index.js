let express = require('express')
let app = express();

let http = require('http');
let server = http.Server(app);

let socketIO = require('socket.io');
let io = socketIO(server);

const port = process.env.PORT || 3600;

let messages = [];

io.on('connection', (socket) => {
    console.log('New User Connected.');
    io.emit('old-messages', messages);
    socket.on('new-message', (message) => {
        io.emit('new-message', message);
        messages.push(message);
    });
});

server.listen(port, () => {
    console.log(`started on port: ${port}`);
});