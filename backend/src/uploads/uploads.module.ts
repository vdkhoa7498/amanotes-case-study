import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [StorageModule, AuthModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
