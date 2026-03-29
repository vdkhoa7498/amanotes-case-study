import { MigrationInterface, QueryRunner } from 'typeorm';

export class MvpKudosRewardsFeed1733100000000 implements MigrationInterface {
  name = 'MvpKudosRewardsFeed1733100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE core_values (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) NOT NULL,
        slug varchar(64) NOT NULL UNIQUE,
        description text,
        sort_order int NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE reward_catalog_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(200) NOT NULL,
        description text,
        points_cost int NOT NULL,
        image_url varchar(2048),
        stock int,
        is_active boolean NOT NULL DEFAULT true,
        sort_order int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT reward_catalog_items_points_positive CHECK (points_cost > 0),
        CONSTRAINT reward_catalog_items_stock_non_negative CHECK (stock IS NULL OR stock >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE kudos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        core_value_id uuid NOT NULL REFERENCES core_values(id) ON DELETE RESTRICT,
        description text NOT NULL,
        status varchar(24) NOT NULL DEFAULT 'processing',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE kudo_recipients (
        kudo_id uuid NOT NULL REFERENCES kudos(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        points int NOT NULL,
        PRIMARY KEY (kudo_id, user_id),
        CONSTRAINT kudo_recipients_points_range CHECK (points >= 10 AND points <= 50)
      )
    `);

    await queryRunner.query(
      `COMMENT ON TABLE kudo_recipients IS 'Many recipients per kudo (PK kudo_id,user_id). Sender debits sum(points); monthly cap is enforced in user_monthly_giving_usage for the sender.'`,
    );

    await queryRunner.query(`
      CREATE TABLE user_monthly_giving_usage (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        year_month date NOT NULL,
        points_spent int NOT NULL DEFAULT 0,
        version int NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (user_id, year_month),
        CONSTRAINT user_monthly_giving_usage_points_non_negative CHECK (points_spent >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE reward_redemptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reward_item_id uuid NOT NULL REFERENCES reward_catalog_items(id) ON DELETE RESTRICT,
        points_spent int NOT NULL,
        status varchar(24) NOT NULL DEFAULT 'pending',
        idempotency_key varchar(64) NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE point_ledger (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount int NOT NULL,
        entry_type varchar(32) NOT NULL,
        kudo_id uuid REFERENCES kudos(id) ON DELETE RESTRICT,
        redemption_id uuid REFERENCES reward_redemptions(id) ON DELETE RESTRICT,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_point_ledger_kudo_received
      ON point_ledger (kudo_id, user_id)
      WHERE kudo_id IS NOT NULL AND entry_type = 'kudo_received'
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_point_ledger_kudo_given
      ON point_ledger (kudo_id)
      WHERE kudo_id IS NOT NULL AND entry_type = 'kudo_given'
    `);

    await queryRunner.query(`
      CREATE TABLE kudo_reactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        kudo_id uuid NOT NULL REFERENCES kudos(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji varchar(32) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (kudo_id, user_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE kudo_comments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        kudo_id uuid NOT NULL REFERENCES kudos(id) ON DELETE CASCADE,
        author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE attached_media (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        kudo_id uuid REFERENCES kudos(id) ON DELETE CASCADE,
        comment_id uuid REFERENCES kudo_comments(id) ON DELETE CASCADE,
        media_type varchar(16) NOT NULL,
        storage_key varchar(2048) NOT NULL,
        duration_seconds int,
        processing_status varchar(24) NOT NULL DEFAULT 'pending',
        sort_order int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT attached_media_one_parent CHECK (
          (kudo_id IS NOT NULL AND comment_id IS NULL)
          OR (kudo_id IS NULL AND comment_id IS NOT NULL)
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE mentions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        mentioned_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kudo_id uuid REFERENCES kudos(id) ON DELETE CASCADE,
        comment_id uuid REFERENCES kudo_comments(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT mentions_one_target CHECK (
          (kudo_id IS NOT NULL AND comment_id IS NULL)
          OR (kudo_id IS NULL AND comment_id IS NOT NULL)
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type varchar(32) NOT NULL,
        payload jsonb NOT NULL,
        read_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_kudos_created_at ON kudos (created_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_kudos_sender_created ON kudos (sender_id, created_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_kudo_recipients_user ON kudo_recipients (user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_kudo_comments_kudo_created ON kudo_comments (kudo_id, created_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_mentions_mentioned_user ON mentions (mentioned_user_id, created_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_notifications_user_read ON notifications (user_id, read_at, created_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_point_ledger_user_created ON point_ledger (user_id, created_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_point_ledger_redemption_id ON point_ledger (redemption_id) WHERE redemption_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_attached_media_kudo ON attached_media (kudo_id) WHERE kudo_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_attached_media_comment ON attached_media (comment_id) WHERE comment_id IS NOT NULL`,
    );

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION tf_kudo_recipients_not_sender()
      RETURNS TRIGGER AS $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM kudos k
          WHERE k.id = NEW.kudo_id AND k.sender_id = NEW.user_id
        ) THEN
          RAISE EXCEPTION 'kudo_recipients: sender cannot be a recipient on the same kudo';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_kudo_recipients_not_sender
      BEFORE INSERT OR UPDATE ON kudo_recipients
      FOR EACH ROW
      EXECUTE FUNCTION tf_kudo_recipients_not_sender();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION tf_point_ledger_kudo_must_balance()
      RETURNS TRIGGER AS $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM point_ledger
          WHERE kudo_id IS NOT NULL
          GROUP BY kudo_id
          HAVING SUM(amount) <> 0
        ) THEN
          RAISE EXCEPTION 'point_ledger: SUM(amount) must be 0 per kudo_id (checked at transaction commit)';
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE CONSTRAINT TRIGGER trg_point_ledger_kudo_balance
      AFTER INSERT OR UPDATE OR DELETE ON point_ledger
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW
      EXECUTE FUNCTION tf_point_ledger_kudo_must_balance();
    `);

    await queryRunner.query(`
      INSERT INTO core_values (name, slug, sort_order) VALUES
        ('Teamwork', 'teamwork', 10),
        ('Ownership', 'ownership', 20),
        ('Customer focus', 'customer-focus', 30)
    `);

    await queryRunner.query(`
      INSERT INTO reward_catalog_items (title, description, points_cost, sort_order) VALUES
        ('Company Hoodie', 'Áo hoodie công ty', 500, 10),
        ('Friday Afternoon Off', 'Nghỉ buổi chiều thứ Sáu', 1000, 20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_kudo_recipients_not_sender ON kudo_recipients`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS tf_kudo_recipients_not_sender()`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_point_ledger_kudo_balance ON point_ledger`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS tf_point_ledger_kudo_must_balance()`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS mentions`);
    await queryRunner.query(`DROP TABLE IF EXISTS attached_media`);
    await queryRunner.query(`DROP TABLE IF EXISTS kudo_comments`);
    await queryRunner.query(`DROP TABLE IF EXISTS kudo_reactions`);
    await queryRunner.query(`DROP TABLE IF EXISTS point_ledger`);
    await queryRunner.query(`DROP TABLE IF EXISTS reward_redemptions`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_monthly_giving_usage`);
    await queryRunner.query(`DROP TABLE IF EXISTS kudo_recipients`);
    await queryRunner.query(`DROP TABLE IF EXISTS kudos`);
    await queryRunner.query(`DROP TABLE IF EXISTS reward_catalog_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS core_values`);
  }
}
