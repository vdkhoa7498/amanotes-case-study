import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, type MqttClient } from 'mqtt';
import { NotificationsGateway } from './notifications.gateway';

const TOPIC_PREFIX = 'kudos/shoutout/';

export type KudoShoutoutMqttPayload = {
  type: 'kudo_received';
  kudoId: string;
  points: number;
  sender: {
    id: string;
    fullName: string | null;
    email: string;
    avatar: string | null;
  };
  coreValue: { id: string; slug: string; name: string };
  descriptionPreview: string;
  createdAt: string;
};

@Injectable()
export class MqttShoutoutBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttShoutoutBridgeService.name);
  private client: MqttClient | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly gateway: NotificationsGateway,
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('MQTT_URL')?.trim();
    if (!url) {
      this.logger.warn('MQTT_URL is empty; kudo shoutouts will not use MQTT.');
      return;
    }
    this.client = connect(url, { reconnectPeriod: 5000, connectTimeout: 10_000 });
    this.client.on('connect', () => {
      this.logger.log(`MQTT connected (${url})`);
      this.client?.subscribe(`${TOPIC_PREFIX}#`, { qos: 0 }, (err) => {
        if (err) this.logger.error(`MQTT subscribe failed: ${err.message}`);
      });
    });
    this.client.on('message', (topic, payload) => {
      if (!topic.startsWith(TOPIC_PREFIX)) return;
      const userId = topic.slice(TOPIC_PREFIX.length);
      if (!userId) return;
      try {
        const data = JSON.parse(payload.toString()) as unknown;
        this.gateway.emitKudoShoutout(userId, data);
      } catch (e) {
        this.logger.warn(`Invalid MQTT payload on ${topic}: ${e}`);
      }
    });
    this.client.on('error', (err) => {
      this.logger.error(`MQTT error: ${err.message}`);
    });
  }

  onModuleDestroy() {
    this.client?.end(true);
    this.client = null;
  }

  publishRecipientShoutout(userId: string, body: KudoShoutoutMqttPayload) {
    if (!this.client?.connected) {
      this.gateway.emitKudoShoutout(userId, body);
      return;
    }
    const topic = `${TOPIC_PREFIX}${userId}`;
    this.client.publish(topic, JSON.stringify(body), { qos: 0 }, (err) => {
      if (err) {
        this.logger.error(`MQTT publish failed: ${err.message}`);
        this.gateway.emitKudoShoutout(userId, body);
      }
    });
  }
}
