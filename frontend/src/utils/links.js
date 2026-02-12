export function normalizeLinkUrl(url) {
  if (!url) return url;
  const host = window.location.hostname;
  const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
  try {
    const parsed = new URL(url);
    if (localHosts.has(parsed.hostname)) {
      parsed.hostname = host;
      return parsed.toString();
    }
    return url;
  } catch (e) {
    // Keep original value for invalid or partial URLs.
    return url;
  }
}
