export function formatTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

export function formatDistance(value: number | null | undefined) {
  if (value == null) return '—';
  return `${Math.round(value)} m`;
}
