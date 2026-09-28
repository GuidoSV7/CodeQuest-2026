/**
 * Path (and query, when the browser URL already matches the rendered path) to come back to after login.
 * On client navigation the layout can render before the router commits the URL, so a stale
 * location only contributes the router pathname. The hash (#cq_session) never travels.
 */
export function sessionReturnTo(pathname: string, location: Pick<Location, "pathname" | "search">): string {
  return location.pathname === pathname ? pathname + location.search : pathname;
}
