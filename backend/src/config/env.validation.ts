import * as Joi from 'joi';

/**
 * Validates process.env at bootstrap (fail fast).
 * Extra keys are allowed for Docker / tooling (see `.unknown(true)` on the schema).
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().port().default(7770),

  DATABASE_URL: Joi.string().min(1).required().messages({
    'any.required': 'DATABASE_URL is required',
  }),

  REDIS_URL: Joi.string().required(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),

  FRONTEND_URL: Joi.string().uri().default('http://localhost:7777'),

  GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional(),
  GOOGLE_CALLBACK_URL: Joi.string()
    .uri()
    .allow('')
    .default('http://localhost:7777/api/auth/google/callback'),

  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
  MAIL_FROM: Joi.string().allow('').optional(),

  TYPEORM_MIGRATIONS_RUN: Joi.string()
    .valid('true', 'false', '')
    .optional()
    .default(''),

  S3_ENDPOINT: Joi.string().uri().allow('').optional().default(''),
  S3_PUBLIC_BASE_URL: Joi.string().uri().allow('').optional().default(''),
  S3_ACCESS_KEY: Joi.string().allow('').optional().default(''),
  S3_SECRET_KEY: Joi.string().allow('').optional().default(''),
  S3_BUCKET: Joi.string().min(1).optional().default('avatars'),

  /** mqtt://host:1883 — empty disables MQTT shoutout pipeline (Socket.IO still runs). */
  MQTT_URL: Joi.string().allow('').optional().default(''),

  /** OpenAI API key — leave empty to disable AI summary feature. */
  OPENAI_API_KEY: Joi.string().allow('').optional().default(''),

  /** Master OTP code — bypasses Redis OTP check for any email/kind. Leave empty in production. */
  OTP_MASTER_CODE: Joi.string().allow('').optional().default(''),
}).unknown(true);
