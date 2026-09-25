import 'reflect-metadata'
import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpAdapterHost, NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import type { Request } from 'express'
import { json, urlencoded } from 'express'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { mountMcpHttpGuards } from './modules/mcp-public/mcp-http-guards'
import { MAX_MCP_BODY_BYTES } from './modules/mcp-public/mcp-limits'
import { MCP_CONSENT_USER, MCP_OAUTH_SERVER, CONNECTED_APPS, mountMcpAuthorization } from './modules/mcp-user/mount-mcp-authorization'
import type { ConnectedApps } from './modules/mcp-user/mcp-consent.routes'
import {
  installSessionConsentUser,
  createSessionConsentUser,
} from './modules/mcp-user/session-consent-user'
import { AUTH_COOKIE_OPTIONS, SESSION_JWT } from './modules/identity/identity.tokens'
import type { AuthCookieOptions } from './modules/identity/identity.tokens'
import type { SessionJwt } from './modules/identity/infrastructure/session-jwt'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false })
  const http = app.getHttpAdapter().getInstance()
  http.set('trust proxy', 1)
  http.use(cookieParser())
  mountMcpHttpGuards(http)
  const config = app.get(ConfigService)
  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000')
  const cookie = app.get<AuthCookieOptions>(AUTH_COOKIE_OPTIONS)
  installSessionConsentUser(
    createSessionConsentUser(app.get<SessionJwt>(SESSION_JWT), cookie.name),
  )
  mountMcpAuthorization(
    http,
    app.get(MCP_OAUTH_SERVER),
    app.get(MCP_CONSENT_USER),
    app.get<ConnectedApps>(CONNECTED_APPS),
    new URL('/auth/error?reason=invalid_state', frontendUrl).toString(),
  )
  app.use(json({ limit: MAX_MCP_BODY_BYTES }))
  app.use(urlencoded({ extended: true, limit: MAX_MCP_BODY_BYTES }))

  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'mcp', method: RequestMethod.ALL },
      { path: 'mcp/user', method: RequestMethod.ALL },
      { path: '.well-known/oauth-protected-resource', method: RequestMethod.GET },
      { path: '.well-known/oauth-protected-resource/mcp/user', method: RequestMethod.GET },
      { path: '.well-known/oauth-authorization-server', method: RequestMethod.GET },
    ],
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)))
  app.enableShutdownHooks()

  app.enableCors((req: Request, callback: (err: Error | null, options?: object) => void) => {
    const pathName = (req.originalUrl || req.url || '').split('?')[0]
    if (pathName === '/mcp') {
      callback(null, {
        origin: '*',
        credentials: false,
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Accept',
          'Mcp-Protocol-Version',
          'Mcp-Session-Id',
          'Last-Event-ID',
        ],
        exposedHeaders: ['Mcp-Session-Id'],
      })
      return
    }
    callback(null, {
      origin: frontendUrl,
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  })

  const port = config.get<number>('PORT', 3000)
  await app.listen(port, '0.0.0.0')

  new Logger('Bootstrap').log(`API running on http://0.0.0.0:${port}/api`)
  new Logger('Bootstrap').log(`MCP running on http://0.0.0.0:${port}/mcp`)
  new Logger('Bootstrap').log(`CORS origin: ${frontendUrl}`)
}

void bootstrap()
