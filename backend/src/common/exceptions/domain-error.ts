/**
 * Errores de dominio agnósticos de framework. El dominio / use-cases lanzan
 * estas clases (NUNCA HttpException); el filtro global las traduce a HTTP.
 */
export abstract class DomainError extends Error {
  abstract readonly httpStatus: number
  readonly code: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = new.target.name
    this.code = code ?? new.target.name
  }
}

/** Recurso inexistente → 404. */
export class EntityNotFoundError extends DomainError {
  readonly httpStatus = 404
}

/** Estado de negocio inválido / violación de invariante → 409. */
export class BusinessRuleError extends DomainError {
  readonly httpStatus = 409
}

/** Entrada inválida a nivel de dominio (no de DTO) → 400. */
export class DomainValidationError extends DomainError {
  readonly httpStatus = 400
}
