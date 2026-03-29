import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MqttShoutoutBridgeService } from './mqtt-shoutout-bridge.service';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  imports: [AuthModule],
  providers: [NotificationsGateway, MqttShoutoutBridgeService],
  exports: [MqttShoutoutBridgeService],
})
export class NotificationsModule {}
