import { Server } from 'socket.io';

const players = {};

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('Starting Socket.io server...');
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log(`Player connected: ${socket.id}`);

      // Initialize player
      players[socket.id] = {
        x: 100,
        y: 100,
        health: 100,
        rank: 1,
      };

      // Send current players to the new player
      socket.emit('init', players);

      // Notify others of the new player
      socket.broadcast.emit('new-player', { id: socket.id, data: players[socket.id] });

      // Handle player movement
      socket.on('move', (data) => {
        if (players[socket.id]) {
          players[socket.id].x = data.x;
          players[socket.id].y = data.y;
          io.emit('player-move', { id: socket.id, x: data.x, y: data.y });
        }
      });

      // Handle clicking (attack or heal)
      socket.on('click', (data) => {
        if (data.type === 'attack' && players[data.targetId]) {
          players[data.targetId].health -= 10 * players[socket.id].rank;
          if (players[data.targetId].health <= 0) {
            delete players[data.targetId];
            io.emit('player-death', { id: data.targetId });
          } else {
            io.emit('update-health', { id: data.targetId, health: players[data.targetId].health });
          }
        } else if (data.type === 'heal' && players[socket.id]) {
          players[socket.id].health = Math.min(100, players[socket.id].health + 10);
          io.emit('update-health', { id: socket.id, health: players[socket.id].health });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('player-disconnect', { id: socket.id });
      });
    });
  }
  res.end();
}
