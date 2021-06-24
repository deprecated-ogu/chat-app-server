const express = require('express');
const socket_io = require('socket.io');
const http = require('http');
const cors = require('cors');
const router = require('./router');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./users')

const app = express();
const server = http.createServer(app); // 서버 생성

const PORT = process.env.PORT || 5000

// 에러 메시지로 인한 cors option
let corsOptions={
	cors: true,
	origins:["http://localhost:3000"],
}
const io = socket_io(server, corsOptions); // socket io에 서버를 전달해 tile server로 만들기 위한 코드

// middleware
app.use(router);
app.use(cors());

// client에서 받은 socket으로 모든 io 함수를 여기서 관리
io.on('connection', (socket) => {
	console.log("We have a new connection!");

	// join event 정의
	socket.on('join', ({ name, room }, callback) => {
		const { error, user } = addUser({ id: socket.id, name, room });
		if (error) return callback(error);	// addUser에서 에러 발생 시 처리
		console.log("what is id : ", user.id);
		console.log(`${name} join the room : ${room}`);
		socket.emit('message', { user: 'admin', text: `${user.name}, Welcome to the room ${user.room}`});	// 해당 클라이언트에게만
		socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name}, has joined!`});	// 해당 클라이언트를 제외한 그 방 모두에게
		
		socket.join(user.room);	// 내장메소드, 해당 방(서버)에 사용자 추가
		
		io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

		callback();
	});

	socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);	// 추가됐던 socket id로 user를 찾음
		console.log("message : ", message);
    io.to(user.room).emit('message', { user: user.name, text: message }); // client의 socket.on message에 전송
		io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) }); // client의 socket.on message에 전송

    callback();
	});

	// disconnect 메시지를 받았을 때 실행
	socket.on('disconnect', () => {
		const user = removeUser(socket.id);

		if (user) {
			io.to(user.room).emit('message', { user: 'admin', text: `${user.name} has left.`});
			console.log("User had left!");
		}
	});
})

server.listen(PORT, () => console.log(`Server connected on port ${PORT}`));