const { Server } = require('socket.io');

let io;

const players = {};

const getRank = (kills) => {
    if (kills >= 50) return 'Diamond';
    if (kills >= 30) return 'Obsidian';
    if (kills >= 20) return 'Sapphire';
    if (kills >= 10) return 'Ruby';
    if (kills >= 5) return 'Gold';
    if (kills >= 3) return 'Silver';
    return 'Bronze';
};

const getDamage = (rank) => {
    switch (rank) {
        case 'Silver': return 10;
        case 'Gold': return 15;
        case 'Ruby': return 20;
        case 'Sapphire': return 25;
        case 'Obsidian': return 30;
        case 'Diamond': return 50;
        default: return 5;
    }
};

const handler = (req, res) => {
    if (!io) {
        io = new Server(res.socket.server, {
            cors: { origin: '*' },
        });

        io.on('connection', (socket) => {
            const id = socket.id;

            players[id] = {
                x: Math.random() * 800,
                y: Math.random() * 600,
                health: 100,
                rank: 'Bronze',
                kills: 0,
            };

            socket.emit('init', { id, players });

            socket.broadcast.emit('player-joined', { id, player: players[id] });

            socket.on('move', ({ x, y }) => {
                if (players[id]) {
                    players[id].x = x;
                    players[id].y = y;
                    io.emit('update-player', { id, player: players[id] });
                }
            });

            socket.on('heal', () => {
                if (players[id]) {
                    players[id].health = Math.min(100, players[id].health + 5);
                    io.emit('update-player', { id, player: players[id] });
                }
            });

            socket.on('attack', (targetId) => {
                if (players[targetId] && players[id]) {
                    const target = players[targetId];
                    target.health -= getDamage(players[id].rank);
                    if (target.health <= 0) {
                        target.health = 0;
                        players[id].kills++;
                        players[id].rank = getRank(players[id].kills);
                    }
                    io.emit('update-player', { id: targetId, player: target });
                    io.emit('update-player', { id, player: players[id] });
                }
            });

            socket.on('disconnect', () => {
                delete players[id];
                io.emit('player-left', id);
            });
        });
    }
    res.end();
};

export default handler;
