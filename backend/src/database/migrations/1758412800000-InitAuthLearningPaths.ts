import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Initial schema for users, Discord auth accounts, questionnaire snapshots,
 * learning paths, path items, and per-user course progress.
 * Matches specs/db-auth-rutas.spec.md §2.
 */
export class InitAuthLearningPaths1758412800000 implements MigrationInterface {
  name = 'InitAuthLearningPaths1758412800000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`)

    await queryRunner.query(
      `CREATE TYPE auth_provider AS ENUM ('discord')`,
    )
    await queryRunner.query(
      `CREATE TYPE learning_path_kind AS ENUM ('generated', 'official', 'custom')`,
    )
    await queryRunner.query(
      `CREATE TYPE learning_path_status AS ENUM ('active', 'archived')`,
    )
    await queryRunner.query(
      `CREATE TYPE path_item_bucket AS ENUM ('required', 'recommended', 'optional', 'anytime')`,
    )
    await queryRunner.query(
      `CREATE TYPE course_progress_status AS ENUM ('not_started', 'in_progress', 'completed')`,
    )

    await queryRunner.query(`
      CREATE TABLE users (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        display_name varchar(128) NOT NULL,
        avatar_url   text NULL,
        email        varchar(320) NULL,
        created_at   timestamptz NOT NULL DEFAULT now(),
        updated_at   timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(
      `CREATE UNIQUE INDEX users_email_uidx ON users (email) WHERE email IS NOT NULL`,
    )

    await queryRunner.query(`
      CREATE TABLE auth_accounts (
        id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider             auth_provider NOT NULL,
        provider_account_id  varchar(64) NOT NULL,
        created_at           timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT auth_accounts_provider_account_uidx
          UNIQUE (provider, provider_account_id)
      )
    `)
    await queryRunner.query(
      `CREATE INDEX auth_accounts_user_id_idx ON auth_accounts (user_id)`,
    )

    await queryRunner.query(`
      CREATE TABLE questionnaire_responses (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        answers    jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(
      `CREATE INDEX questionnaire_responses_user_id_idx ON questionnaire_responses (user_id)`,
    )

    await queryRunner.query(`
      CREATE TABLE learning_paths (
        id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title                      varchar(200) NOT NULL,
        kind                       learning_path_kind NOT NULL,
        questionnaire_response_id  uuid NULL
          REFERENCES questionnaire_responses(id) ON DELETE SET NULL,
        catalog_version            int NOT NULL,
        status                     learning_path_status NOT NULL DEFAULT 'active',
        source_catalog_path_id     varchar(128) NULL,
        created_at                 timestamptz NOT NULL DEFAULT now(),
        updated_at                 timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT learning_paths_official_source_chk CHECK (
          (kind <> 'official') OR (source_catalog_path_id IS NOT NULL)
        )
      )
    `)
    await queryRunner.query(
      `CREATE INDEX learning_paths_user_status_idx ON learning_paths (user_id, status)`,
    )
    await queryRunner.query(
      `CREATE INDEX learning_paths_user_created_idx ON learning_paths (user_id, created_at DESC)`,
    )

    await queryRunner.query(`
      CREATE TABLE learning_path_items (
        id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        learning_path_id uuid NOT NULL
          REFERENCES learning_paths(id) ON DELETE CASCADE,
        course_id        varchar(32) NOT NULL,
        course_slug      varchar(256) NOT NULL,
        course_title     varchar(256) NOT NULL,
        position         int NOT NULL CHECK (position >= 0),
        bucket           path_item_bucket NULL,
        created_at       timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT learning_path_items_path_course_uidx
          UNIQUE (learning_path_id, course_id),
        CONSTRAINT learning_path_items_path_position_uidx
          UNIQUE (learning_path_id, position)
      )
    `)
    await queryRunner.query(
      `CREATE INDEX learning_path_items_path_pos_idx ON learning_path_items (learning_path_id, position)`,
    )

    await queryRunner.query(`
      CREATE TABLE user_course_progress (
        user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id    varchar(32) NOT NULL,
        status       course_progress_status NOT NULL DEFAULT 'not_started',
        started_at   timestamptz NULL,
        completed_at timestamptz NULL,
        updated_at   timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, course_id),
        CONSTRAINT user_course_progress_completed_chk CHECK (
          (status = 'completed' AND completed_at IS NOT NULL)
          OR (status <> 'completed' AND completed_at IS NULL)
        ),
        CONSTRAINT user_course_progress_started_chk CHECK (
          (status = 'not_started' AND started_at IS NULL)
          OR (status <> 'not_started')
        )
      )
    `)
    await queryRunner.query(
      `CREATE INDEX user_course_progress_user_status_idx ON user_course_progress (user_id, status)`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_course_progress`)
    await queryRunner.query(`DROP TABLE IF EXISTS learning_path_items`)
    await queryRunner.query(`DROP TABLE IF EXISTS learning_paths`)
    await queryRunner.query(`DROP TABLE IF EXISTS questionnaire_responses`)
    await queryRunner.query(`DROP TABLE IF EXISTS auth_accounts`)
    await queryRunner.query(`DROP TABLE IF EXISTS users`)
    await queryRunner.query(`DROP TYPE IF EXISTS course_progress_status`)
    await queryRunner.query(`DROP TYPE IF EXISTS path_item_bucket`)
    await queryRunner.query(`DROP TYPE IF EXISTS learning_path_status`)
    await queryRunner.query(`DROP TYPE IF EXISTS learning_path_kind`)
    await queryRunner.query(`DROP TYPE IF EXISTS auth_provider`)
  }
}
