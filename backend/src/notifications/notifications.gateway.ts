import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: true, credentials: true },
})
export class NotificationsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService) {}

  emitKudoShoutout(userId: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit('kudo:shoutout', payload);
  }

  handleConnection(client: Socket) {
    const auth = client.handshake.auth as { token?: string } | undefined;
    const header = client.handshake.headers.authorization;
    const bearer =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice(7)
        : undefined;
    const token = auth?.token ?? bearer;
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const p = this.jwt.verify<JwtPayload>(token);
      void client.join(`user:${p.sub}`);
    } catch (e) {
      this.logger.warn(`WS auth failed: ${e instanceof Error ? e.message : e}`);
      client.disconnect(true);
    }
  }
}
