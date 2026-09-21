import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { Env } from '../../config/env.validation'
import { createAuthService } from './application/auth.service'
import { AuthAccountOrmEntity } from './infrastructure/auth-account.orm-entity'
import { createDiscordOAuthClient } from './infrastructure/discord-oauth.client'
import { createMemoryOAuthStateStore } from './infrastructure/memory-oauth-state-store'
import { createSessionJwt } from './infrastructure/session-jwt'
import { createTypeormUserRepository } from './infrastructure/typeorm-user.repository'
import { UserOrmEntity } from './infrastructure/user.orm-entity'
import {
  AUTH_COOKIE_OPTIONS,
  AUTH_SERVICE,
  DISCORD_OAUTH_CLIENT,
  SESSION_JWT,
  type AuthCookieOptions,
} from './identity.tokens'
import { OAUTH_STATE_STORE } from './ports/oauth-state-store.port'
import { USER_REPOSITORY } from './ports/user-repository.port'
import { AuthController } from './presentation/auth.controller'
import { SessionAuthGuard } from './presentation/session-auth.guard'

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([UserOrmEntity, AuthAccountOrmEntity]),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: USER_REPOSITORY,
      inject: [DataSource],
      useFactory: (ds: DataSource) => createTypeormUserRepository(ds),
    },
    {
      provide: OAUTH_STATE_STORE,
      useFactory: () => createMemoryOAuthStateStore(),
    },
    {
      provide: DISCORD_OAUTH_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        createDiscordOAuthClient({
          clientId: config.get('DISCORD_CLIENT_ID', { infer: true }),
          clientSecret: config.get('DISCORD_CLIENT_SECRET', { infer: true }),
          redirectUri: config.get('DISCORD_REDIRECT_URI', { infer: true }),
          fetcher: globalThis.fetch.bind(globalThis) as never,
        }),
    },
    {
      provide: SESSION_JWT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        createSessionJwt({
          secret: config.get('SESSION_JWT_SECRET', { infer: true }),
          ttlDays: config.get('SESSION_TTL_DAYS', { infer: true }),
        }),
    },
    {
      provide: AUTH_COOKIE_OPTIONS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): AuthCookieOptions => {
        const ttlDays = config.get('SESSION_TTL_DAYS', { infer: true })
        return {
          name: config.get('SESSION_COOKIE_NAME', { infer: true }),
          maxAgeSeconds: ttlDays * 24 * 60 * 60,
          secure: config.get('SESSION_COOKIE_SECURE', { infer: true }),
          sameSite: config.get('SESSION_COOKIE_SAMESITE', { infer: true }),
          httpOnly: true,
          path: '/',
        }
      },
    },
    {
      provide: AUTH_SERVICE,
      inject: [
        OAUTH_STATE_STORE,
        DISCORD_OAUTH_CLIENT,
        USER_REPOSITORY,
        SESSION_JWT,
        ConfigService,
      ],
      useFactory: (
        stateStore: ReturnType<typeof createMemoryOAuthStateStore>,
        discord: ReturnType<typeof createDiscordOAuthClient>,
        users: ReturnType<typeof createTypeormUserRepository>,
        sessionJwt: ReturnType<typeof createSessionJwt>,
        config: ConfigService<Env, true>,
      ) =>
        createAuthService({
          stateStore,
          discord,
          users,
          sessionJwt,
          oauthStateTtlSeconds: config.get('OAUTH_STATE_TTL_SECONDS', {
            infer: true,
          }),
          frontendUrl: config.get('FRONTEND_URL', { infer: true }),
        }),
    },
    SessionAuthGuard,
  ],
  exports: [
    USER_REPOSITORY,
    SESSION_JWT,
    AUTH_COOKIE_OPTIONS,
    SessionAuthGuard,
    AUTH_SERVICE,
  ],
})
export class IdentityModule {}
