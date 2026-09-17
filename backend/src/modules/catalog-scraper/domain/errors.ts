export class CatalogParseError extends Error {
  readonly code = 'CATALOG_PARSE_ERROR' as const

  constructor(
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'CatalogParseError'
  }
}
