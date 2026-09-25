export function secureUrlFromUpload(result: { secure_url?: string }): string {
  const url = result.secure_url?.trim() ?? ''
  if (!url.startsWith('https://res.cloudinary.com/')) {
    throw new Error('cloudinary_url_missing')
  }
  return url
}
