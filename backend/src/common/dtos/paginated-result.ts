/** Respuesta paginada estándar. Toda lista del API la usa. */
export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
}

export function paginate<T>(
  items: T[],
  totalCount: number,
  pagination: { page: number; pageSize: number },
): PaginatedResult<T> {
  return {
    items,
    totalCount,
    page: pagination.page,
    pageSize: pagination.pageSize,
  }
}
