import { describe, expect, it } from 'vitest'
import { secureUrlFromUpload } from './secure-url-from-upload'

describe('secureUrlFromUpload', () => {
  it('accepts a Cloudinary https URL', () => {
    expect(
      secureUrlFromUpload({
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/CodeQuest/avatars/a.png',
      }),
    ).toBe('https://res.cloudinary.com/demo/image/upload/v1/CodeQuest/avatars/a.png')
  })

  it('rejects a missing or non-Cloudinary URL', () => {
    expect(() => secureUrlFromUpload({})).toThrow(/cloudinary_url_missing/)
    expect(() =>
      secureUrlFromUpload({ secure_url: 'https://example.com/a.png' }),
    ).toThrow(/cloudinary_url_missing/)
  })
})
