const io = require('socket.io-client');

const socket = io('http://localhost:3002', {
  path: '/socket.io/', // Must match server's SOCKET_PATH
  transports: ['websocket'], // Must match server's transports
  allowEIO3: true, // If server has this enabled
  autoConnect: true,
});

socket.on('connect', () => {
  console.log('Connected to server!');
  socket.emit('join_group', 'someGroupId', (response) => {
    console.log('Join group response:', response);
  });
});

socket.on('connect_error', (err) => {
  console.error('Connection Error:', err.message);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('user_joined', (userId) => {
  console.log(`User ${userId} joined the group.`);
});