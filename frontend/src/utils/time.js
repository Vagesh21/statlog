export function formatMelbourne(ts) {
  if (!ts) return '';
  try {
    const date = new Date(ts);
    return new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Melbourne',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  } catch (e) {
    return ts;
  }
}
