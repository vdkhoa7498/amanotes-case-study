import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowZeroPointsCost1733300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reward_catalog_items
        DROP CONSTRAINT reward_catalog_items_points_positive,
        ADD CONSTRAINT reward_catalog_items_points_non_negative CHECK (points_cost >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reward_catalog_items
        DROP CONSTRAINT reward_catalog_items_points_non_negative,
        ADD CONSTRAINT reward_catalog_items_points_positive CHECK (points_cost > 0)
    `);
  }
}
