/**
 * Menghasilkan tanggal YYYY-MM-DD dan waktu WIB terformat pada server zona waktu Asia/Jakarta.
 */
export function getJakartaNow() {
  const now = new Date();
  const jakartaDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // YYYY-MM-DD

  const jakartaTimeStr = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  return {
    iso: now.toISOString(),
    date: jakartaDateStr,
    time: `${jakartaTimeStr} WIB`,
    epochMs: now.getTime(),
  };
}

export function formatJakartaDateTime(isoString: string): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return (
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date) + " WIB"
  );
}

export function formatJakartaDate(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function generateSecureEventToken(prefix = "KEV"): string {
  const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}-${randomPart.toUpperCase()}`;
}
