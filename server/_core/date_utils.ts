export function pad2(value: number) {
  return String(value).padStart(2, "0");
}

/**
 * Returns a date key in YYYY-MM-DD format for a given date,
 * forced to Bolivia timezone (UTC-4) to ensure consistency
 * between server (UTC) and local business operations.
 */
export function getLocalDateKey(value: unknown): string | null {
  if (!value) return null;
  
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else {
    date = new Date(value as any);
  }

  if (Number.isNaN(date.getTime())) return null;

  // Bolivia is UTC-4. 
  // We adjust the UTC time by -4 hours to get the local date components correctly
  // even if the server is in a different timezone.
  const BOLIVIA_OFFSET_HOURS = -4;
  const boDate = new Date(date.getTime() + (BOLIVIA_OFFSET_HOURS * 60 * 60 * 1000));
  
  const y = boDate.getUTCFullYear();
  const m = pad2(boDate.getUTCMonth() + 1);
  const d = pad2(boDate.getUTCDate());
  
  return `${y}-${m}-${d}`;
}

export function toValidDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value as any);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
