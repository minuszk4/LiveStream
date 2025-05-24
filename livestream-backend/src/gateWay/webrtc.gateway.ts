import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface RoomClients {
  [roomId: string]: Set<string>; // roomId -> set socketIds
}

@WebSocketGateway({
  cors: { origin: '*' },
})
export class WebrtcGateway {
  @WebSocketServer()
  server: Server;

  private rooms: RoomClients = {};

  @SubscribeMessage('join-room')
  handleJoinRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    const { roomId } = data;

    // Join socket.io room
    client.join(roomId);

    if (!this.rooms[roomId]) {
      this.rooms[roomId] = new Set();
    }

    this.rooms[roomId].forEach((socketId) => {
      this.server.to(socketId).emit('new-peer', { socketId: client.id });
      client.emit('new-peer', { socketId });
    });

    this.rooms[roomId].add(client.id);

    client.emit('joined-room', { roomId, socketId: client.id });
  }

  @SubscribeMessage('signal')
  handleSignal(@MessageBody() data: { to: string; from: string; signal: any }, @ConnectedSocket() client: Socket) {
    const { to, from, signal } = data;
    this.server.to(to).emit('signal', { from, signal });
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    const { roomId } = data;
    client.leave(roomId);
    this.rooms[roomId]?.delete(client.id);
    this.server.to(roomId).emit('peer-left', { socketId: client.id });
  }
  @SubscribeMessage('disconnect')
  handleDisconnect(client: Socket) {
    for (const roomId in this.rooms) {
      if (this.rooms[roomId].has(client.id)) {
        this.rooms[roomId].delete(client.id);
        this.server.to(roomId).emit('peer-left', { socketId: client.id });
      }
    }
  }
}
