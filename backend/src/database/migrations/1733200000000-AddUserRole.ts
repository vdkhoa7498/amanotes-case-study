import * as bcrypt from 'bcrypt';
import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_ADMIN_EMAIL = 'admin@goodjob.local';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123456';

export class AddUserRole1733200000000 implements MigrationInterface {
  name = 'AddUserRole1733200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add role column (idempotent)
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role varchar(16) NOT NULL DEFAULT 'staff'
    `);

    // 2. Seed default admin account (skip if already exists)
    const existing = (await queryRunner.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [DEFAULT_ADMIN_EMAIL],
    )) as unknown as unknown[];

    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
      await queryRunner.query(
        `INSERT INTO users
          (email, password_hash, email_verified, full_name, employee_code, gender, date_of_birth, role)
         VALUES
          ($1, $2, true, 'System Admin', 'ADMIN-001', 'other', '1990-01-01', 'admin')`,
        [DEFAULT_ADMIN_EMAIL, passwordHash],
      );
    } else {
      // Ensure existing admin@goodjob.local has admin role
      await queryRunner.query(
        `UPDATE users SET role = 'admin' WHERE email = $1`,
        [DEFAULT_ADMIN_EMAIL],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM users WHERE email = $1`,
      [DEFAULT_ADMIN_EMAIL],
    );
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS role`);
  }
}
