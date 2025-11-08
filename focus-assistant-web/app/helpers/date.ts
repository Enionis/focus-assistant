// app/helpers/date.ts
export function getTodayIndex(createdAtISO: string) {
  const created = new Date(createdAtISO);
  const now = new Date();
  const createdUTC = Date.UTC(created.getFullYear(), created.getMonth(), created.getDate());
  const nowUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((nowUTC - createdUTC) / (24 * 60 * 60 * 1000));
  return diffDays + 1;
}