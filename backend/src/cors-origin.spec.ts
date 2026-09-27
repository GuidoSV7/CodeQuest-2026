import { describe, expect, it } from 'vitest'
import { credentialCorsOrigin } from './cors-origin'

const frontend = 'https://codequest-frontend-oiueyi-4bb3e7-31-97-78-167.sslip.io'

describe('credentialCorsOrigin', () => {
  it('allows the production frontend and localhost dev', () => {
    expect(credentialCorsOrigin(frontend, frontend)).toBe(true)
    expect(credentialCorsOrigin('http://localhost:3000', frontend)).toBe(true)
    expect(credentialCorsOrigin('http://127.0.0.1:3000', frontend)).toBe(true)
  })

  it('rejects an unknown site', () => {
    expect(credentialCorsOrigin('https://evil.example', frontend)).toBe(false)
  })
})
