const express = require('express');
const socket_io = require('socket.io');
const http = require('http');
const cors = require('cors');
const router = require('./router');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./users')

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000

let corsOptions={
	cors: true,
	origins:["http://localhost:3000"],
}
const io = socket_io(server, corsOptions);


app.use(router);
app.use(cors());

io.on('connection', (socket) => {
	console.log("We have a new connection!");

	socket.on('join', ({ name, room }, callback) => {
		const { error, user } = addUser({ id: socket.id, name, room });
		if (error) return callback(error);
		console.log(`${name} join the room : ${room}`);
		socket.emit('message', { user: 'admin', text: `${user.name}, Welcome to the room ${user.room}`});
		socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name}, has joined!`});
		socket.join(user.room);
		
		callback();
	});

	socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit('message', { user: user.name, text: message });
    callback();
	});

	socket.on('disconnect', () => {
		console.log("User had left!");
	});
})

server.listen(PORT, () => console.log(`Server connected on port ${PORT}`));