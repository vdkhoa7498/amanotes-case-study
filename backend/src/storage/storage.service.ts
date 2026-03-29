import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { AppException } from '../common/errors';
import { ErrorCode } from '../common/errors/error-codes';

const AVATAR_MIME = new Set<string>([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const COMMENT_MEDIA_MIME = new Set<string>([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
]);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client | null = null;
  private readonly bucket: string;
  private readonly publicBase: string;
  private readonly configured: boolean;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('S3_BUCKET') ?? 'avatars';
    const endpoint = this.config.get<string>('S3_ENDPOINT')?.trim() ?? '';
    const accessKey = this.config.get<string>('S3_ACCESS_KEY')?.trim() ?? '';
    const secretKey = this.config.get<string>('S3_SECRET_KEY')?.trim() ?? '';
    this.publicBase = this.config.get<string>('S3_PUBLIC_BASE_URL')?.trim() ?? '';
    this.configured = !!(endpoint && accessKey && secretKey && this.publicBase);
    if (this.configured) {
      this.client = new S3Client({
        region: 'us-east-1',
        endpoint,
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        },
        forcePathStyle: true,
      });
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async onModuleInit(): Promise<void> {
    if (!this.client) return;
    try {
      await this.ensureBucketAndPolicy();
    } catch (e) {
      this.logger.warn(
        `MinIO/S3 bucket init skipped or failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private async ensureBucketAndPolicy(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucket}/*`],
        },
      ],
    };
    await this.client.send(
      new PutBucketPolicyCommand({
        Bucket: this.bucket,
        Policy: JSON.stringify(policy),
      }),
    );
  }

  async uploadPublicImage(
    buffer: Buffer,
    mimetype: string,
  ): Promise<{ url: string; key: string }> {
    if (!this.client || !this.configured) {
      throw new AppException(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Lưu trữ file chưa được cấu hình (S3/MinIO).',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (!AVATAR_MIME.has(mimetype)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const ext = EXT_BY_MIME[mimetype] ?? 'bin';
    const key = `register/${randomUUID()}.${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      }),
    );
    const base = this.publicBase.replace(/\/$/, '');
    const url = `${base}/${this.bucket}/${key}`;
    return { url, key };
  }

  /** Ảnh + video cho bình luận feed (JPEG/PNG/WebP, MP4/WebM). */
  async uploadCommentMedia(
    buffer: Buffer,
    mimetype: string,
  ): Promise<{ url: string; key: string }> {
    if (!this.client || !this.configured) {
      throw new AppException(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Lưu trữ file chưa được cấu hình (S3/MinIO).',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (!COMMENT_MEDIA_MIME.has(mimetype)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Định dạng file không được hỗ trợ (ảnh JPEG/PNG/WebP hoặc video MP4/WebM).',
        HttpStatus.BAD_REQUEST,
      );
    }
    const ext = EXT_BY_MIME[mimetype] ?? 'bin';
    const key = `comments/${randomUUID()}.${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      }),
    );
    const base = this.publicBase.replace(/\/$/, '');
    const url = `${base}/${this.bucket}/${key}`;
    return { url, key };
  }
}
