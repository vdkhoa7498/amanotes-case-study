import {
  Controller,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppException } from '../common/errors';
import { ErrorCode } from '../common/errors/error-codes';
import { StorageService } from '../storage/storage.service';

const MAX_BYTES = 2 * 1024 * 1024;
const COMMENT_MEDIA_MAX_BYTES = 50 * 1024 * 1024;

@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_BYTES },
    }),
  )
  async uploadAvatar(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: MAX_BYTES })
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|png|webp)$/,
        })
        .build({
          errorHttpStatusCode: HttpStatus.BAD_REQUEST,
          fileIsRequired: true,
        }),
    )
    file: Express.Multer.File,
  ) {
    if (!this.storage.isConfigured()) {
      throw new AppException(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Lưu trữ file chưa được cấu hình (S3/MinIO).',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const { url } = await this.storage.uploadPublicImage(file.buffer, file.mimetype);
    return { url };
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('comment-media')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: COMMENT_MEDIA_MAX_BYTES },
    }),
  )
  async uploadCommentMedia(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: COMMENT_MEDIA_MAX_BYTES })
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|png|webp)|video\/(mp4|webm)$/,
        })
        .build({
          errorHttpStatusCode: HttpStatus.BAD_REQUEST,
          fileIsRequired: true,
        }),
    )
    file: Express.Multer.File,
  ) {
    if (!this.storage.isConfigured()) {
      throw new AppException(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Lưu trữ file chưa được cấu hình (S3/MinIO).',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return this.storage.uploadCommentMedia(file.buffer, file.mimetype);
  }
}
