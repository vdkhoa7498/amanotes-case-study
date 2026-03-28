import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';

config({
  path: join(__dirname, '../../.env'),
});

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
});
