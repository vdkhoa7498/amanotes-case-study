/* Nodemailer's published types are not fully compatible with typescript-eslint strict checks here. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-redundant-type-constituents */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port ?? 587,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  async sendOtp(to: string, purpose: string, code: string): Promise<void> {
    const subject = `[Good Job] Mã xác thực — ${purpose}`;
    const text = `Mã OTP của bạn: ${code}\nCó hiệu lực trong 10 phút. Không chia sẻ mã này với ai.`;

    if (this.transporter) {
      await this.transporter.sendMail({
        from:
          this.configService.get<string>('MAIL_FROM') ?? 'noreply@localhost',
        to,
        subject,
        text,
      });
      this.logger.log(`OTP email sent to ${to} (${purpose})`);
      return;
    }

    this.logger.warn(
      `[DEV] OTP for ${to} (${purpose}): ${code} — cấu hình SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) để gửi email thật.`,
    );
  }
}
