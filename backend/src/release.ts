export function releaseCommit(): string {
  const commit = process.env.GIT_COMMIT?.trim()
  return commit ? commit : 'unknown'
}
