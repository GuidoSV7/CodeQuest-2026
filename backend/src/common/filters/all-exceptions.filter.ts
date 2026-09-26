import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import { DomainError } from '../exceptions/domain-error'

type ErrorBody = {
  statusCode: number
  code: string
  message: unknown
  path: string
  timestamp: string
}

/**
 * Filtro global: traduce DomainError y HttpException a un cuerpo consistente
 * y deja los errores desconocidos como 500 (logueados). Los controllers no
 * llevan try/catch.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost
    const ctx = host.switchToHttp()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message: unknown = 'Internal server error'
    let code = 'InternalServerError'

    if (exception instanceof DomainError) {
      status = exception.httpStatus
      message = exception.message
      code = exception.code
    } else if (exception instanceof HttpException) {
      status = exception.getStatus()
      const res = exception.getResponse()
      if (typeof res === 'string') {
        message = res
        code = exception.name
      } else {
        const obj = res as Record<string, unknown>
        message = obj.message ?? res
        code = typeof obj.code === 'string' ? obj.code : exception.name
      }
    }

    if (status >= 500) {
      const request = ctx.getRequest<{ method?: string }>()
      this.logger.error(
        {
          event: 'unhandled_exception',
          err:
            exception instanceof Error
              ? { type: exception.name, message: exception.message, stack: exception.stack }
              : { message: String(exception) },
          path: httpAdapter.getRequestUrl(ctx.getRequest()),
          method: request.method,
          statusCode: status,
        },
        'Unhandled exception',
      )
    }

    const body: ErrorBody = {
      statusCode: status,
      code,
      message,
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      timestamp: new Date().toISOString(),
    }

    httpAdapter.reply(ctx.getResponse(), body, status)
  }
}
