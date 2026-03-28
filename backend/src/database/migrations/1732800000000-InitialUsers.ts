import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class InitialUsers1732800000000 implements MigrationInterface {
  name = 'InitialUsers1732800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'password_hash',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'email_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'google_id',
            type: 'varchar',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'full_name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'employee_code',
            type: 'varchar',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'gender',
            type: 'varchar',
            length: '16',
            isNullable: true,
          },
          {
            name: 'date_of_birth',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'avatar',
            type: 'varchar',
            length: '2048',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
