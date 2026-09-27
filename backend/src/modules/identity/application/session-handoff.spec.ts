import { describe, expect, it } from 'vitest'
import { sessionHandoffUrl } from './session-handoff'

describe('sessionHandoffUrl', () => {
  it('puts the session token in the fragment only for local dev', () => {
    const url = sessionHandoffUrl('http://localhost:3000/configurador-de-ruta', 'jwt-token')
    const parsed = new URL(url)
    expect(parsed.origin).toBe('http://localhost:3000')
    expect(parsed.pathname).toBe('/configurador-de-ruta')
    expect(parsed.search).toBe('')
    expect(parsed.hash).toBe('#cq_session=jwt-token')
  })

  it('leaves the production redirect without the token', () => {
    const url = sessionHandoffUrl('https://app.example.com/mis-rutas', 'jwt-token')
    expect(url).toBe('https://app.example.com/mis-rutas')
    expect(new URL(url).hash).toBe('')
  })
})
