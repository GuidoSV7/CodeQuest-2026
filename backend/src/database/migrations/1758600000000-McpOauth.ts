import type { MigrationInterface, QueryRunner } from 'typeorm'

/** OAuth clients, codes, and hashed tokens for the authenticated MCP server. */
export class McpOauth1758600000000 implements MigrationInterface {
  name = 'McpOauth1758600000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE oauth_clients (
        client_id text PRIMARY KEY,
        client_name text,
        redirect_uris text[] NOT NULL,
        token_endpoint_auth_method text,
        client_secret_hash text,
        grant_types text[],
        scope text,
        client_json jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`
      CREATE TABLE oauth_cimd_documents (
        client_id text PRIMARY KEY,
        document jsonb NOT NULL,
        fetched_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL
      )
    `)
    await queryRunner.query(`
      CREATE TABLE oauth_authorization_codes (
        code_hash text PRIMARY KEY,
        client_id text NOT NULL,
        user_id uuid REFERENCES users(id),
        redirect_uri text NOT NULL,
        code_challenge text NOT NULL,
        scopes text[] NOT NULL,
        resource text,
        grant_id uuid,
        expires_at timestamptz NOT NULL
      )
    `)
    await queryRunner.query(`
      CREATE TABLE oauth_access_tokens (
        token_hash text PRIMARY KEY,
        user_id uuid REFERENCES users(id),
        client_id text NOT NULL,
        scopes text[] NOT NULL,
        resource text,
        grant_id uuid,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz
      )
    `)
    await queryRunner.query(`
      CREATE TABLE oauth_refresh_tokens (
        token_hash text PRIMARY KEY,
        client_id text NOT NULL,
        user_id uuid REFERENCES users(id),
        grant_id uuid,
        scopes text[] NOT NULL,
        resource text,
        expires_at timestamptz NOT NULL,
        consumed_at timestamptz
      )
    `)
    await queryRunner.query(`
      CREATE TABLE oauth_resume (
        id uuid PRIMARY KEY,
        authorization_request jsonb NOT NULL,
        csrf_secret_hash text,
        expires_at timestamptz NOT NULL,
        used_at timestamptz
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS oauth_resume`)
    await queryRunner.query(`DROP TABLE IF EXISTS oauth_refresh_tokens`)
    await queryRunner.query(`DROP TABLE IF EXISTS oauth_access_tokens`)
    await queryRunner.query(`DROP TABLE IF EXISTS oauth_authorization_codes`)
    await queryRunner.query(`DROP TABLE IF EXISTS oauth_cimd_documents`)
    await queryRunner.query(`DROP TABLE IF EXISTS oauth_clients`)
  }
}
