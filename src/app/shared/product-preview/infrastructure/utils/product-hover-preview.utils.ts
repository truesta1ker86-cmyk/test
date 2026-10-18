export function localProductImage(raw: string | null, databaseCopy = false): string | null {
  if (!raw) return null;
  if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(raw)) return raw;
  try {
    const url = new URL(raw, location.origin);
    if (
      databaseCopy &&
      url.protocol === 'https:' &&
      /^ir(?:-\d+)?\.ozone\.ru$/.test(url.hostname) &&
      url.pathname.startsWith('/s3/') &&
      !url.username &&
      !url.password &&
      !url.port
    )
      return url.href;
    return url.origin === location.origin && /^\/(v2|static)\//.test(url.pathname)
      ? url.href
      : null;
  } catch {
    return null;
  }
}
